const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-").replace("T", "_");
const outputDir = path.join(process.cwd(), "cypress/tests/security");
const outputFile = path.join(outputDir, `zap-report-${ts}.html`);

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const zapDir = "C:\\Program Files\\ZAP\\Zed Attack Proxy";

execSync(
  `zap.bat -cmd -quickurl http://localhost:3000 -quickout "${outputFile}" -quickprogress`,
  { stdio: "inherit", cwd: zapDir }
);
