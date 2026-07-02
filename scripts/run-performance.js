const { execSync } = require("child_process");

const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-").replace("T", "_");
const output = `cypress/tests/performance/k6-results-${ts}.json`;

execSync(
  `k6 run cypress/tests/performance/load-test.spec.ts --compatibility-mode=extended --out json=${output}`,
  { stdio: "inherit" }
);
