const { execSync } = require("child_process");

const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-").replace("T", "_");
const output = `cypress/tests/performance/artillery-results-${ts}.json`;

execSync(
  `artillery run cypress/tests/performance/load-test.artillery.yml --output ${output}`,
  { stdio: "inherit" }
);
