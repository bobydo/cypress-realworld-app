# Upload Cypress test results to Xray Cloud (JSON) or attach an HTML report to a Jira issue.
#
# Usage:
#   .\scripts\Upload-XrayResult.ps1 -File "cypress/logs/index.html_2026-07-02T080421-0600.html" -TestExecutionKey SCRUM-9
#   https://baoshenyi.atlassian.net/browse/SCRUM-9
#   .\scripts\Upload-XrayResult.ps1 -File "cypress/logs/run.html" -IssueKey SCRUM-8

param(
    [Parameter(Mandatory)]
    [string]$File,

    # Associate JSON results with an existing Xray Test Execution (e.g. SCRUM-8).
    # When omitted a new Test Execution is created automatically.
    [string]$TestExecutionKey = "",

    # Jira issue to attach an HTML report to (overrides JIRA_ISSUE_KEY in .env.local).
    [string]$IssueKey = ""
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# ── Logging ───────────────────────────────────────────────────────────────────
$script:logFile = $null

function Initialize-Log {
    $logDir = Join-Path (Join-Path $PSScriptRoot "..") "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir | Out-Null
    }
    $ts = Get-Date -Format "yyyy-MM-ddTHHmmss"
    $script:logFile = Join-Path $logDir "xray-upload-$ts.log"
    Write-Log "Log started: $($script:logFile)"
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    $color = switch ($Level) {
        "SUCCESS" { "Green"  }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red"    }
        default   { "Cyan"   }
    }
    Write-Host $entry -ForegroundColor $color
    if ($script:logFile) {
        Add-Content -Path $script:logFile -Value $entry -Encoding UTF8
    }
}

function Fail {
    param([string]$Reason)
    Write-Log $Reason "ERROR"
    Write-Log "Upload FAILED. See log: $($script:logFile)" "ERROR"
    exit 1
}

# ── Load .env.local ───────────────────────────────────────────────────────────
function Load-Env {
    $envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^([^#=\s][^=]*)=(.+)$") {
                [System.Environment]::SetEnvironmentVariable(
                    $matches[1].Trim(), $matches[2].Trim(), "Process")
            }
        }
        Write-Log "Loaded environment from $envFile"
    } else {
        Write-Log ".env.local not found; relying on existing environment variables" "WARN"
    }
}

# ── Auth ──────────────────────────────────────────────────────────────────────
function Get-XrayToken {
    param([string]$ClientId, [string]$ClientSecret)

    Write-Log "Authenticating with Xray Cloud..."
    $authBody = @{ client_id = $ClientId; client_secret = $ClientSecret } | ConvertTo-Json
    try {
        $token = Invoke-RestMethod `
            -Uri         "https://xray.cloud.getxray.app/api/v2/authenticate" `
            -Method      POST `
            -ContentType "application/json" `
            -Body        ([System.Text.Encoding]::UTF8.GetBytes($authBody)) `
            -ErrorAction Stop
    } catch {
        Fail "Authentication request failed: $($_.Exception.Message)"
    }

    $token = "$token".Trim()
    if (-not $token -or $token.Length -lt 20 -or -not $token.StartsWith("eyJ")) {
        Fail "Xray returned an invalid token. Verify XRAY_CLIENT_ID / XRAY_CLIENT_SECRET."
    }

    Write-Log "Authentication successful. Token: $($token.Substring(0,8))..."
    return $token
}

# ── Mochawesome → Xray JSON conversion ───────────────────────────────────────
function ConvertSuite {
    param($suite)
    foreach ($t in $suite.tests) {
        $status = if     ($t.pass)                       { "PASSED"  }
                  elseif ($t.fail)                        { "FAILED"  }
                  elseif ($t.pending -or $t.skipped)      { "SKIPPED" }
                  else                                    { "TODO"    }

        $errMsg = if ($t.err -and $t.err.message) { "$($t.err.message)" } else { "" }

        $script:xrTests.Add([ordered]@{
            testInfo = [ordered]@{
                projectKey = $script:projectKey
                summary    = if ($t.fullTitle) { $t.fullTitle } else { $t.title }
                type       = "Generic"
            }
            status  = $status
            comment = $errMsg
        })
    }
    foreach ($child in $suite.suites) { ConvertSuite $child }
}

# ── HTTP helper (curl for clean UTF-8 + binary body) ─────────────────────────
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers,
        [string]$BodyFile = "",
        [string]$FormField = ""   # e.g. "file=@path;type=text/html"
    )

    $tmpOut  = [System.IO.Path]::GetTempFileName()
    $hdrArgs = @()
    foreach ($kv in $Headers.GetEnumerator()) { $hdrArgs += "-H"; $hdrArgs += "$($kv.Key): $($kv.Value)" }

    if ($BodyFile) {
        $code = curl.exe -s -o $tmpOut -w "%{http_code}" -X $Method $Uri @hdrArgs --data-binary "@$BodyFile"
    } elseif ($FormField) {
        $code = curl.exe -s -o $tmpOut -w "%{http_code}" -X $Method $Uri @hdrArgs -F $FormField
    } else {
        $code = curl.exe -s -o $tmpOut -w "%{http_code}" -X $Method $Uri @hdrArgs
    }

    $body = (Get-Content $tmpOut -Raw -ErrorAction SilentlyContinue).Trim()
    Remove-Item $tmpOut -ErrorAction SilentlyContinue
    return [PSCustomObject]@{ Code = $code; Body = $body }
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════
Initialize-Log
Load-Env

# ── Requirement 9: Validate file exists ───────────────────────────────────────
Write-Log "Validating file: $File"
if (-not (Test-Path $File)) {
    Fail "File not found: $File"
}
Write-Log "File exists: $(Resolve-Path $File)"

$ext = [System.IO.Path]::GetExtension($File).ToLower()

# ══════════════════════════════════════════════════════════════════════════════
# JSON → Xray Cloud import
# ══════════════════════════════════════════════════════════════════════════════
if ($ext -eq ".json") {

    $clientId     = $env:XRAY_CLIENT_ID
    $clientSecret = $env:XRAY_CLIENT_SECRET
    if (-not $clientId -or -not $clientSecret) {
        Fail "Missing XRAY_CLIENT_ID or XRAY_CLIENT_SECRET in .env.local"
    }

    # Requirement 1 & 2: Authenticate → token
    $token = Get-XrayToken -ClientId $clientId -ClientSecret $clientSecret

    # Derive project key from TestExecutionKey, fall back to "SCRUM"
    $script:projectKey = if ($TestExecutionKey -match '^([A-Z]+)-\d+$') { $Matches[1] } else { "SCRUM" }

    Write-Log "Parsing mochawesome report..."
    try {
        $data           = Get-Content $File -Raw -Encoding UTF8 | ConvertFrom-Json
        $script:xrTests = [System.Collections.Generic.List[object]]::new()

        foreach ($result in $data.results) {
            foreach ($suite in $result.suites) { ConvertSuite $suite }
        }
    } catch {
        Fail "Failed to parse mochawesome report: $($_.Exception.Message)"
    }
    Write-Log "Converted $($script:xrTests.Count) tests (project: $($script:projectKey))"

    # Build payload
    $info = [ordered]@{
        project    = $script:projectKey
        summary    = "Cypress Execution - $([System.IO.Path]::GetFileNameWithoutExtension($File))"
        startDate  = $data.stats.start
        finishDate = $data.stats.end
    }

    # Requirement 4: include testExecutionKey when caller supplies one.
    # Omit `info` when updating an existing execution — Xray tries to set screen-locked
    # custom fields (testEnvironments / testPlans) which causes a 400 if not on Edit screen.
    $payload = if ($TestExecutionKey) {
        Write-Log "Associating with existing Test Execution: $TestExecutionKey"
        [ordered]@{ testExecutionKey = $TestExecutionKey; tests = $script:xrTests }
    } else {
        [ordered]@{ info = $info; tests = $script:xrTests }
    }

    $payloadJson = $payload | ConvertTo-Json -Depth 10

    # Write payload to temp file (UTF-8, no BOM)
    $tmpJson = [System.IO.Path]::GetTempFileName()
    try {
        [System.IO.File]::WriteAllText($tmpJson, $payloadJson, [System.Text.Encoding]::UTF8)

        Write-Log "Uploading to https://xray.cloud.getxray.app/api/v2/import/execution ..."

        # Requirement 3: Upload Xray JSON
        $resp = Invoke-Api `
            -Method  POST `
            -Uri     "https://xray.cloud.getxray.app/api/v2/import/execution" `
            -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
            -BodyFile $tmpJson

        # Requirement 5: Log complete response
        Write-Log "HTTP status : $($resp.Code)"
        Write-Log "Raw response: $($resp.Body)"

        if ($resp.Code -match '^2') {
            $parsed = $resp.Body | ConvertFrom-Json

            Write-Log "Upload succeeded. Test Execution: $($parsed.key)" "SUCCESS"

            Write-Host ""
            Write-Host "============================" -ForegroundColor Green
            Write-Host " XRAY UPLOAD SUCCESSFUL" -ForegroundColor Green
            Write-Host "============================" -ForegroundColor Green
            Write-Host "Test Execution Key : $($parsed.key)"
            Write-Host "Tests Imported     : $($script:xrTests.Count)"
            Write-Host "Project            : $($script:projectKey)"
            if ($TestExecutionKey) { Write-Host "Associated With    : $TestExecutionKey" }
            Write-Host ""
            Write-Host "Full Response:" -ForegroundColor Cyan
            Write-Host ($resp.Body | ConvertFrom-Json | ConvertTo-Json -Depth 10)
            Write-Host ""
            Write-Host "Log file: $($script:logFile)" -ForegroundColor DarkGray

            exit 0   # Requirement 6: exit 0 on success
        } else {
            Fail "Upload failed (HTTP $($resp.Code)): $($resp.Body)"
        }
    } finally {
        Remove-Item $tmpJson -ErrorAction SilentlyContinue
    }

# ══════════════════════════════════════════════════════════════════════════════
# HTML → Jira attachment
# ══════════════════════════════════════════════════════════════════════════════
} elseif ($ext -eq ".html") {

    $jiraEmail = $env:JIRA_EMAIL
    $jiraToken = $env:JIRA_API_TOKEN
    $jiraUrl   = $env:JIRA_BASE_URL

    if (-not $IssueKey) { $IssueKey = $env:JIRA_ISSUE_KEY }
    if (-not $IssueKey -and $TestExecutionKey) { $IssueKey = $TestExecutionKey }

    if (-not $jiraEmail -or -not $jiraToken -or -not $jiraUrl) {
        Fail "Missing JIRA_EMAIL, JIRA_API_TOKEN, or JIRA_BASE_URL in .env.local"
    }
    if (-not $IssueKey) {
        Fail "No issue key specified. Use -IssueKey SCRUM-8 or -TestExecutionKey SCRUM-8"
    }

    $resolvedFile = (Resolve-Path $File).Path
    $b64Auth      = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${jiraEmail}:${jiraToken}"))
    $attachUri    = "$jiraUrl/rest/api/3/issue/$IssueKey/attachments"

    Write-Log "Attaching $File to Jira issue $IssueKey ..."
    Write-Log "Endpoint: $attachUri"

    try {
        $resp = Invoke-Api `
            -Method    POST `
            -Uri       $attachUri `
            -Headers   @{ Authorization = "Basic $b64Auth"; "X-Atlassian-Token" = "no-check" } `
            -FormField "file=@$resolvedFile;type=text/html"

        Write-Log "HTTP status : $($resp.Code)"
        Write-Log "Raw response: $($resp.Body)"

        if ($resp.Code -match '^2') {
            $parsed   = $resp.Body | ConvertFrom-Json
            $filename = if ($parsed -is [array]) { $parsed[0].filename } else { $parsed.filename }

            Write-Log "Attachment succeeded: $filename" "SUCCESS"

            Write-Host ""
            Write-Host "============================" -ForegroundColor Green
            Write-Host " JIRA ATTACHMENT SUCCESSFUL" -ForegroundColor Green
            Write-Host "============================" -ForegroundColor Green
            Write-Host "Issue    : $IssueKey"
            Write-Host "File     : $filename"
            Write-Host "URL      : $jiraUrl/browse/$IssueKey"
            Write-Host ""
            Write-Host "Full Response:" -ForegroundColor Cyan
            Write-Host ($resp.Body | ConvertFrom-Json | ConvertTo-Json -Depth 10)
            Write-Host ""
            Write-Host "Log file: $($script:logFile)" -ForegroundColor DarkGray

            exit 0
        } else {
            Fail "Attachment failed (HTTP $($resp.Code)): $($resp.Body)"
        }
    } catch {
        Fail "Attachment error: $($_.Exception.Message)"
    }

} else {
    Fail "Unsupported file type '$ext'. Use .json (Xray import) or .html (Jira attachment)."
}
