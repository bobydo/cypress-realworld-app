# Examples

## Why you fit for this QA Automation developer role?
I believe I'm a strong fit because I have a software development background, so I can understand production code, write unit and automation tests, and help build CI/CD pipelines. I enjoy working closely with developers to improve software quality by finding root causes and building reliable, maintainable test automation.

## Q: How do you test responsive design in Cypress?
**Desktop**
```javascript
cy.viewport(1280, 720)
cy.get('[data-cy=login-button]')
  .should('be.visible')
```

**Mobile**
```javascript
cy.viewport('iphone-x')
cy.get('[data-cy=hamburger-menu]')
  .click()

cy.get('[data-cy=login-button]')
  .should('be.visible')
```
**Interview answer (30 seconds):**
> I use `cy.viewport()` to simulate different screen sizes, such as desktop, tablet, and mobile. Then I verify that responsive elements, like navigation menus, buttons, and forms, are displayed and behave correctly. For example, on mobile I would verify the hamburger menu is shown instead of the desktop navigation.

## What difficult task you did, result?

**Situation:** The application used a multi-domain SSO chain — App → Keycloak → Azure AD → MFA → CAPTCHA → App. Every test that needed an authenticated user had to go through that full flow, making the suite slow and flaky in CI because MFA codes expire and CAPTCHA blocks automation by design.

**Task:** Find a way to run a reliable regression suite in CI without removing the real SSO test coverage entirely.

**Action:** I split the strategy into two tracks:
- **Programmatic login** for the bulk of tests — `cy.request()` posts credentials directly to the Keycloak token endpoint (`/realms/demo/protocol/openid-connect/token`), retrieves a JWT, sets it in `localStorage`, then `cy.session()` caches that authenticated state so it's only fetched once per spec file, not before every test.
- **One real UI smoke test** that walks the full App → Keycloak → Azure AD → MFA path, run only on UAT (not every PR), to confirm the real SSO flow still works end-to-end.

```ts
Cypress.Commands.add("loginByApi", (username, password) => {
  cy.session([username], () => {
    cy.request("POST", "/oauth/token", { username, password, grant_type: "password" })
      .then(({ body }) => {
        window.localStorage.setItem("access_token", body.access_token);
      });
  });
});
```

**Result:** In dev and CI, we used a dedicated Keycloak test account that was whitelisted to bypass MFA and CAPTCHA from Microsoft/Azure AD — so automated tests could run the full login flow without hitting those blocks. On UAT, we relied on manual integration testing with real SSO, MFA, and CAPTCHA, which is where a human tester validates the complete identity flow before production. This split kept automation fast and reliable in CI, while still ensuring the real-world login experience was verified by a human at the right stage.


## Performance Testing — k6

**Tool:** [k6](https://k6.io) (open-source, scripts in JavaScript, CI/CD friendly)

**Where Cypress stops:** Cypress runs one virtual user in a real browser. It can't simulate 500 concurrent users hitting an API endpoint.

**What k6 does:**
```js
// load-test.js
import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 100,        // 100 virtual users
  duration: "30s", // for 30 seconds
};

export default function () {
  const res = http.get("http://localhost:3001/transactions");
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response < 500ms": (r) => r.timings.duration < 500,
  });
}
```

Run: `k6 run load-test.js`

**Interview answer (30 seconds):**
> Cypress is great for functional E2E but it's not designed for load testing — it runs one browser session at a time. For performance testing I'd use k6, which can simulate hundreds of concurrent users with scripts written in JavaScript. I'd add it to the CI pipeline to catch performance regressions on critical API endpoints, for example asserting that the transactions endpoint responds in under 500ms under load.

**How it fits alongside Cypress in CI/CD:**
```
Cypress (functional)  +  k6 (performance)  →  same CI pipeline
        ▼                       ▼
   Did it work?          Was it fast enough?
```

---

## Security Testing — OWASP ZAP

**Tool:** [OWASP ZAP](https://www.zaproxy.org) (free, open-source DAST scanner, industry standard)

**Where Cypress stops:** Cypress can assert a response header exists (`cy.request()` → check `X-Frame-Options`), but it can't automatically scan for XSS, SQL injection, broken auth, or OWASP Top 10 vulnerabilities.

**What OWASP ZAP does (DAST — Dynamic Application Security Testing):**
```
ZAP Proxy sits between the test runner and your app,
passively observing traffic and actively probing for vulnerabilities.

Cypress / browser → ZAP Proxy → Your App
                        │
                  Scans for:
                  - XSS injection points
                  - Missing security headers
                  - Broken authentication
                  - Sensitive data exposure
```

**Typical CI/CD integration (ZAP baseline scan):**
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html
```

**Interview answer (30 seconds):**
> Cypress isn't a security testing tool — it can verify a `Content-Security-Policy` header is present, but it can't find XSS or injection vulnerabilities. For security I'd use OWASP ZAP, which is a DAST scanner that proxies between the test runner and the app, actively probing for OWASP Top 10 vulnerabilities. I'd run a ZAP baseline scan in CI on every PR targeting a test environment, and flag any new findings as a build warning or failure depending on severity.

---

## CORS does not affect k6

This project defines CORS in [backend/app.ts:31-34](backend/app.ts#L31-L34):
```js
const corsOption = {
  origin: `http://localhost:${frontendPort}`, // only requests from localhost:3000 allowed
  credentials: true,
};
```
Applied to every request at [backend/app.ts:53](backend/app.ts#L53):
```js
app.use(cors(corsOption));
```

CORS is a **browser security feature only** — k6 makes plain HTTP requests with no browser involved, so the server's CORS headers are irrelevant to k6.

**Browser request (CORS enforced):**
```http
GET /testData/transactions HTTP/1.1
Host: api.uat.example.com
Origin: https://app.uat.example.com        ← browser adds this automatically
Referer: https://app.uat.example.com/
Accept: application/json
```
Server responds with:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.uat.example.com
```
If `Access-Control-Allow-Origin` is missing or wrong → **browser blocks the response** before JavaScript can read it.

**k6 request (no CORS):**
```http
GET /testData/transactions HTTP/1.1
Host: api.uat.example.com
Accept: */*                                ← no Origin header, k6 is not a browser
```
Server responds → **k6 reads the response directly**, no CORS check ever happens.

**How k6 is invoked locally** ([package.json](package.json)):
```json
"test:performance": "node scripts/run-performance.js"
```
[scripts/run-performance.js](scripts/run-performance.js) generates a timestamp and runs:
```bash
k6 run cypress/tests/performance/load-test.spec.ts \
  --compatibility-mode=extended \
  --out json=cypress/tests/performance/k6-results-2026-07-02_14-35-22.json
```
k6 is a plain Node/Go process — no browser launched, no `Origin` header, CORS never involved.

**Interview answer (30 seconds):**
> CORS is enforced by the browser, not the server. k6 is a Go process making raw HTTP requests — it never sends an `Origin` header and never checks `Access-Control-Allow-Origin`. So CORS policies have zero effect on k6 load tests, the same way they have no effect on curl or Postman. What *can* block k6 on UAT is authentication (no valid token) or a firewall restricting traffic to the UAT network.

---

## White-box vs Black-box — a real example from this codebase

[backend/database.ts:339-340](backend/database.ts#L339-L340):
```ts
export const getTransactionsForUserForApi = (userId: string, query?: object) =>
  flow(getTransactionsForUserByObj(userId), formatTransactionsForApiResponse)(query);
```
`flow()` pipes the result of the first function into the second. Two separate responsibilities composed into one exported function.

**Black-box (API/E2E) test only:**
```
Input → API → Output ❌ wrong
```
You know the output is wrong but not *why*. The failure could be in any of:
- query parsing
- `getTransactionsForUserByObj()` filtering incorrectly
- `formatTransactionsForApiResponse()` formatting incorrectly
- the database returning unexpected data

**White-box (unit) tests — test each function in isolation:**

```
query
  ▼
getTransactionsForUserByObj(userId)
  ▼
transactions

→ Does the correct query return the expected transactions?
→ What if query is empty?
→ What if userId doesn't exist?
```

```
transactions
  ▼
formatTransactionsForApiResponse()
  ▼
API JSON

→ Are dates formatted correctly?
→ Are fields renamed correctly?
→ Is the response shape correct?
```

Now if the API test fails, you already know which building block to look at.

**The testing pyramid:**
```
        E2E / Cypress  (few)
               ▲
        Integration
               ▲
        Unit / Jest  (many)
```

- **Unit tests (white-box)** — verify each small function in isolation (Jest/Vitest for functions like `getTransactionsForUserByObj` and `formatTransactionsForApiResponse`).
- **Integration tests** — verify the functions work correctly together.
- **E2E / Cypress (black-box)** — verify the whole user journey from the browser.

The goal is not to choose one over the other — they complement each other. Cypress excels at black-box E2E; Jest/Vitest is better for unit-testing individual functions. `flow()` in this codebase is a concrete example of why relying on E2E alone makes failures harder to diagnose.

---

## Test Result Logs — HTML + JSON output

**What is generated and where:**
```
cypress/logs/
  ├── index.html          ← human-readable report (open in browser)
  └── index.json          ← Xray-compatible JSON (upload to Jira)

cypress/tests/performance/
  └── k6-results-2026-07-02_14-35-22.json   ← k6 load test metrics
```

**How it is set up** ([cypress.config.ts](cypress.config.ts)):
```ts
reporter: "cypress-mochawesome-reporter",
reporterOptions: {
  reportDir: "cypress/logs",
  json: true,             // outputs JSON alongside HTML for Xray upload
  embeddedScreenshots: true,  // failed test screenshots embedded in HTML
  inlineAssets: true,    // single self-contained HTML file, no extra folders
}
```

Three wiring points required for the reporter to work:
```
cypress.config.ts → reporter + reporterOptions          (config)
cypress.config.ts → require("cypress-mochawesome-reporter/plugin")(on)  (screenshots)
cypress/support/e2e.ts → import "cypress-mochawesome-reporter/register" (hooks)
```

**Local commands:**
```bash
yarn test              # cypress open (GUI) — no logs generated
yarn test:headless     # cypress run (headless) — logs saved to cypress/logs/
yarn test:performance  # k6 load test — saves k6-results-[timestamp].json
```

**Why `yarn test` does not generate logs:**
`cypress open` is interactive GUI mode — the reporter only fires during `cypress run` (headless). Logs are always generated when running headless, no extra flag needed since the reporter is configured globally in `cypress.config.ts`.

**CI/CD artifacts saved per run** ([.github/workflows/cypress.yml](.github/workflows/cypress.yml)):
```
cypress-report-html-container-1-2026-07-02_14-35-22   ← HTML for human reading
cypress-report-json-container-1-2026-07-02_14-35-22   ← JSON for Xray upload
cypress-report-html-container-2-2026-07-02_14-35-22   ← container 2 HTML
cypress-report-json-container-2-2026-07-02_14-35-22   ← container 2 JSON
k6-performance-report-2026-07-02_14-35-22             ← k6 metrics
zap-security-report                                    ← OWASP ZAP HTML
```
Each container uploads separately (keyed by `${{ matrix.containers }}`) so parallel runners don't overwrite each other. `if: always()` ensures logs are uploaded even when tests fail — most useful when you need to diagnose a failure.

---

## OWASP ZAP — run security scan locally

**Prerequisite:** app must be running (`yarn start`) and Java 17+ installed.

**Why `cd` first:**
`zap.bat` looks for `zap-2.17.0.jar` in the **current directory** — running it from another folder causes `Error: Unable to access jarfile`. Must `cd` into the ZAP install folder before running.

```powershell
yarn test:security
```
Which runs [scripts/run-security.js](scripts/run-security.js) — sets `cwd` to the ZAP folder automatically, saves report to `cypress/tests/security/zap-report-[timestamp].html`.

Or run manually:
```powershell
cd "C:\Program Files\ZAP\Zed Attack Proxy"
.\zap.bat -cmd -quickurl http://localhost:3000 -quickout D:\cypress-realworld-app\cypress\tests\security\zap-report.html -quickprogress
```

| Flag | Meaning |
|---|---|
| `-cmd` | headless — no GUI window |
| `-quickurl` | app URL to scan |
| `-quickout` | full path to save HTML report (use absolute path since we cd'd away from the project) |
| `-quickprogress` | print scan progress to terminal |

**Open the report after the scan:**
```powershell
start D:\cypress-realworld-app\cypress\tests\security\zap-report-[timestamp].html
```

**CI equivalent** ([.github/workflows/cypress.yml](/.github/workflows/cypress.yml)):
```yaml
- name: OWASP ZAP Baseline Scan
  uses: zaproxy/action-baseline@v0.12.0
  with:
    target: "http://localhost:3000"
    report_html: zap-report.html
```
The CI action runs the same scan inside a Docker container — no Java or ZAP install needed on the runner.

---

## Upload Test Results to Jira with Xray

### 1. What is Xray?

Xray is a Jira test-management plugin. It adds three new Jira issue types — **Test**, **Test Execution**, and **Test Plan** — and lets you import automated test results (Cypress, JUnit, etc.) directly into Jira issues, so QA coverage and pass/fail history live alongside stories and tasks.

---

### 2. Jira + Xray Issue Hierarchy

```
Epic  (SCRUM-0)
  └── Story  (SCRUM-1)          ← user-facing feature or requirement
        └── Task  (SCRUM-X)     ← work item: "Write automated regression tests"
              └── Test Execution  (SCRUM-8)   ← Xray: one CI run / sprint run
                    ├── Test Case  (SCRUM-9)  ← Xray Test: "Run X6 Script passed"
                    └── Test Case  (SCRUM-10) ← Xray Test: "Run X6 Script failed"
```

| Level | Jira Issue Type | Owner | Purpose |
|---|---|---|---|
| **Story** | Story | Product / BA | What the user needs ("As a user I can pay") |
| **Task** | Task | Dev / QA | Work needed ("Automate payment regression") |
| **Test Execution** | Xray Test Execution | QA | One run of the suite (per sprint / per build) |
| **Test Case** | Xray Test | QA | One individual test scenario (pass or fail) |

---

### 3. Real Example — this project

```
Story   SCRUM-1   "Website performance issue"
          │
Task      SCRUM-X  "Automate Cypress regression"
          │
Test Execution  SCRUM-8  "Performance Test Execution"
          ├── Test  SCRUM-9   "Run X6 Script passed"   → PASSED
          └── Test  SCRUM-10  "Run X6 Script Failed"   → FAILED
```

SCRUM-8 is the container for one CI run. SCRUM-9 and SCRUM-10 are the individual test cases inside it. Xray shows a pass/fail matrix across all runs on the SCRUM-8 issue page.

---

### 4. Credentials — `.env.local` (gitignored, never committed)

```
XRAY_CLIENT_ID=your-xray-client-id
XRAY_CLIENT_SECRET=your-xray-client-secret
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-atlassian-api-token
JIRA_BASE_URL=https://yoursite.atlassian.net
```

Xray Cloud API token: Jira → Apps → Xray → API Keys
Atlassian API token: https://id.atlassian.com/manage-profile/security/api-tokens

---

### 5. Upload Script — `scripts/Upload-XrayResult.ps1`

```
Upload-XrayResult.ps1 -File <path> [-TestExecutionKey <key>] [-IssueKey <key>]
```

| Parameter | Required | Description |
|---|---|---|
| `-File` | Yes | Path to `.json` (Xray import) or `.html` (Jira attachment) |
| `-TestExecutionKey` | No | Associate JSON results with an existing Test Execution (e.g. `SCRUM-8`) |
| `-IssueKey` | No | Attach HTML to this Jira issue (e.g. `SCRUM-9`); falls back to `JIRA_ISSUE_KEY` in `.env.local` |

---

### 6. Step-by-Step: Upload JSON results to existing Test Execution

**Step 1** — Run Cypress headless to generate the report:
```bash
yarn test:headless
# output: cypress/logs/index.html_<timestamp>.json
#         cypress/logs/index.html_<timestamp>.html
```

**Step 2** — Authenticate with Xray Cloud (script does this automatically):
```
POST https://xray.cloud.getxray.app/api/v2/authenticate
Body: { "client_id": "...", "client_secret": "..." }
Response: "eyJhbGci..."   ← short-lived JWT
```

**Step 3** — Upload JSON to existing Test Execution SCRUM-8:
```powershell
.\scripts\Upload-XrayResult.ps1 `
  -File "cypress/logs/index.html_2026-07-02T080421-0600.json" `
  -TestExecutionKey SCRUM-8
```

**Step 4** — Xray imports all 111 tests and links them to SCRUM-8:
```
POST https://xray.cloud.getxray.app/api/v2/import/execution
Body: { "testExecutionKey": "SCRUM-8", "tests": [ ... 111 tests ... ] }
Response: { "id": "10039", "key": "SCRUM-8" }
```

**Step 5** — Console output on success:
```
============================
 XRAY UPLOAD SUCCESSFUL
============================
Test Execution Key : SCRUM-8
Tests Imported     : 111
Project            : SCRUM
Associated With    : SCRUM-8

Full Response:
{ "id": "10039", "key": "SCRUM-8", "self": "https://baoshenyi.atlassian.net/..." }

Log file: logs/xray-upload-2026-07-04T164854.log
```

---

### 7. Step-by-Step: Attach HTML report to a Jira issue

```powershell
.\scripts\Upload-XrayResult.ps1 `
  -File "cypress/logs/index.html_2026-07-02T080421-0600.html" `
  -TestExecutionKey SCRUM-9
```

Uses the Jira REST API:
```
POST https://baoshenyi.atlassian.net/rest/api/3/issue/SCRUM-9/attachments
Header: X-Atlassian-Token: no-check
Body:   multipart/form-data  file=@report.html
Response: [{ "id": "10001", "filename": "index.html_...", "size": 990924 }]
```

```
============================
 JIRA ATTACHMENT SUCCESSFUL
============================
Issue    : SCRUM-9
File     : index.html_2026-07-02T080421-0600.html
URL      : https://baoshenyi.atlassian.net/browse/SCRUM-9
```

---

### 8. Payload format — Xray native JSON

The script converts mochawesome output to Xray's native JSON format.
Each Cypress test becomes a `testInfo` entry (Xray finds or creates the matching Test issue by `summary`):

```json
{
  "testExecutionKey": "SCRUM-8",
  "tests": [
    {
      "testInfo": {
        "projectKey": "SCRUM",
        "summary": "Bank Accounts API GET /bankAccounts gets a list",
        "type": "Generic"
      },
      "status": "PASSED",
      "comment": ""
    },
    {
      "testInfo": {
        "projectKey": "SCRUM",
        "summary": "Transactions POST /transactions returns 401",
        "type": "Generic"
      },
      "status": "FAILED",
      "comment": "AssertionError: expected 200 to equal 401"
    }
  ]
}
```

---

### 9. Logs

Every run writes a timestamped log to `logs/`:
```
logs/
  xray-upload-2026-07-04T164854.log
  xray-upload-2026-07-04T170020.log
```

Each log contains: timestamp, level (INFO / SUCCESS / WARN / ERROR), HTTP status, and full API response body — useful for CI debugging without re-running the suite.

---

### 10. Why not the Mocha-specific endpoint?

Xray Cloud exposes a format-specific endpoint (`/api/v2/import/execution/mocha`) but it is only available on certain paid plans. The script uses the generic endpoint (`/api/v2/import/execution`) with Xray's native JSON format, which is available on all plans and gives the same result.

---

**Interview answer (30 seconds):**
> After each CI run Cypress generates a mochawesome JSON report. Our PowerShell script authenticates with Xray Cloud using a client ID and secret to get a short-lived JWT, then converts the mochawesome output to Xray's native JSON format and POSTs it to the Xray import endpoint, associating the results with an existing Test Execution issue like SCRUM-8. Xray maps each test to a Test Case issue by summary, updates pass/fail status, and shows the full execution matrix in Jira — so the team can track quality trends sprint over sprint without leaving Jira. Failures also attach the HTML report to the relevant test case as a Jira attachment so developers can open the mochawesome report directly from the issue.

** Attchment and report
![alt text](docs/Screenshot%202026-07-05%20093121.png)
![alt text](docs/Screenshot%202026-07-05%20093217.png)

---

## Q: Why do you need Xray? What does Jira do vs what does Xray do?

**Jira** is a project management tool — it tracks Stories, Tasks, Bugs, and Epics. It has no built-in concept of a test case, test run, or pass/fail history.

**Xray** is a test management plugin for Jira. It adds three new issue types on top of Jira:

| Xray Issue Type | What it stores |
|---|---|
| **Test** | One test case (e.g. "Login with invalid password") |
| **Test Execution** | One run of a suite — groups Tests with pass/fail results for that run |
| **Test Plan** | A collection of Test Executions across sprints for trend reporting |

**Why not just use Jira alone?**
Jira has no REST API endpoint to import automated test results. You cannot POST a JUnit/Mocha JSON and have Jira automatically create pass/fail records. Xray adds that API (`POST /api/v2/import/execution`) and the data model to store it.

**Why not just use a standalone tool like TestRail or Zephyr?**
Xray lives inside Jira, so test results are linked directly to Stories and Bugs as first-class Jira issues. A failing Test Execution on SCRUM-8 shows up on the same board as the Story it covers — no context switch to a separate tool.

**Technical flow:**
```
Cypress run
    ↓ mochawesome JSON
Upload-XrayResult.ps1
    ↓ POST /api/v2/authenticate    → JWT token
    ↓ POST /api/v2/import/execution → Xray creates/updates Test issues,
                                       records status per Test Execution
Jira board
    └── SCRUM-8 (Test Execution) shows green/red matrix
          ├── SCRUM-9  PASSED
          └── SCRUM-10 FAILED
```

**Interview answer (30 seconds):**
> Jira manages work items — stories, tasks, bugs — but it has no concept of a test case or automated test result. Xray extends Jira with three issue types: Test, Test Execution, and Test Plan, and adds a REST API to import automated results directly. Test cases become first-class Jira issues, so a failing test execution automatically links back to the story it covers — no manual work.
>
> At my previous company we used TestRail alongside Jira. Every time a test case related to a Jira story, someone had to manually copy the Jira ticket number into TestRail and keep both tools in sync. That's error-prone and it breaks the moment someone forgets to update one side. I recommended switching to Xray because the link between a test case and its story is a native Jira relationship — it's maintained automatically, and developers see test status directly on their board without switching tools.
