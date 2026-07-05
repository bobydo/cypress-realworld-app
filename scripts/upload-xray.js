const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env.local (gitignored — contains XRAY_CLIENT_ID and XRAY_CLIENT_SECRET)
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  fs.readFileSync(envLocalPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.+)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

const clientId = process.env.XRAY_CLIENT_ID;
const clientSecret = process.env.XRAY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing XRAY_CLIENT_ID or XRAY_CLIENT_SECRET in .env.local");
  process.exit(1);
}

// Xray's mocha endpoint expects standard Mocha JSON: { stats, tests, passes, failures, pending }
// cypress-mochawesome-reporter generates: { stats, results: [{ suites: [...] }], meta }
// This converts between the two formats.
function toMochaJson(raw) {
  const data = JSON.parse(raw);
  if (Array.isArray(data.tests)) return raw; // already standard Mocha format

  const passes = [], failures = [], pending = [], allTests = [];

  function extractTests(suite) {
    for (const t of suite.tests || []) {
      const test = { title: t.title, fullTitle: t.fullTitle, duration: t.duration || 0, currentRetry: t.currentRetry || 0, err: t.err || {} };
      allTests.push(test);
      if (t.pass) passes.push(test);
      else if (t.fail) failures.push(test);
      else if (t.pending || t.skipped) pending.push(test);
    }
    for (const child of suite.suites || []) extractTests(child);
  }

  for (const result of data.results || [])
    for (const suite of result.suites || []) extractTests(suite);

  return JSON.stringify({ stats: data.stats, tests: allTests, passes, failures, pending });
}

function post(urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === "object" ? JSON.stringify(body) : body;
    const req = https.request(
      {
        hostname: "xray.cloud.getxray.app",
        path: urlPath,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(data) },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const fileArg = process.argv[2];
  const reportPath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(process.cwd(), "cypress/logs/index.json");

  if (!fs.existsSync(reportPath)) {
    console.error(`Report not found: ${reportPath}`);
    console.error("Usage: node scripts/upload-xray.js [path/to/result.json]");
    process.exit(1);
  }

  console.log(`Uploading: ${reportPath}`);

  console.log("Authenticating with Xray...");
  const auth = await post(
    "/api/v2/authenticate",
    { "Content-Type": "application/json" },
    { client_id: clientId, client_secret: clientSecret }
  );

  if (auth.status !== 200) {
    console.error("Auth failed:", auth.body);
    process.exit(1);
  }

  const token = JSON.parse(auth.body); // Xray returns a bare JWT string
  console.log("Token obtained.");

  const report = toMochaJson(fs.readFileSync(reportPath, "utf8"));
  console.log("Uploading Mocha report to Xray (project: SCRUM)...");
  const upload = await post(
    "/api/v2/import/execution/mocha?projectKey=SCRUM",
    { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    report
  );

  if (upload.status === 200 || upload.status === 201) {
    const result = JSON.parse(upload.body);
    console.log("Upload successful! Test Execution:", result.testExecIssue?.key || upload.body);
  } else {
    console.error("Upload failed:", upload.status, upload.body);
    process.exit(1);
  }
}

main().catch(console.error);
