# QA Automation Interview — Questions & Answers

Each answer follows three sections:
- **Direct Answer** — say this in the first 30 seconds
- **Concept & Reasoning** — high-level concept, best practices, trade-offs, simple example
- **My Experience** — what I actually built, results, and numbers

---

## Q1. Walk through the defect lifecycle

### Direct Answer *(30 seconds)*
A defect goes through six stages: **Identify → Log → Assign → Fix → Retest → Close** (or Reopen). The goal is a clear paper trail from discovery to resolution, with no defect falling through the cracks.

### Concept & Reasoning
- **Identify** — found during manual exploration, automated test failure, or code review.
- **Log** — written in Jira with: steps to reproduce, expected vs actual result, severity (Critical/High/Medium/Low), priority, environment, screenshots, and log files. A defect with missing steps wastes developer time.
- **Assign** — goes to the responsible developer. If unclear, the QA lead triages with the team.
- **Fix** — developer resolves the root cause, not just the symptom.
- **Retest** — QA retests the exact scenario that failed. A fix that closes one door and opens another is still a defect.
- **Regression** — run the full or targeted regression suite to confirm nothing else broke. This step is skipped by teams in a hurry and regretted in production.
- **Close or Reopen** — close if the fix holds; reopen with fresh evidence if it does not. Severity and environment are re-recorded on reopen.

Best practice: link the defect to the automated test that caught it. When the test passes again, the defect closes automatically — no manual tracking needed.

### My Experience
In this project, failed Cypress tests are automatically imported into Jira via Xray after every CI run. The failed test in Xray links directly to the **Test Execution issue (SCRUM-8)**, which links to the **Story** it covers — so the developer can open the defect, see the mochawesome HTML report as an attachment, and reproduce the failure without waiting for QA to describe it.

The PowerShell script `scripts/Upload-XrayResult.ps1` handles the full loop: authenticate with Xray Cloud → convert mochawesome JSON → POST to `/api/v2/import/execution` → each failed test becomes a linked Test issue with `FAILED` status. The HTML report is attached to the Jira issue so the developer opens a visual, step-by-step report directly from the ticket.

---

## Q2. How do you do sprint planning?

### Direct Answer *(30 seconds)*
I review the user stories and acceptance criteria, estimate testing effort based on automation reuse, identify regression scope, and confirm environment readiness before the sprint starts.

### Concept & Reasoning
Good sprint planning from a QA perspective has four parts:

1. **Clarify requirements** — sit with the developer and Product Owner to resolve ambiguous acceptance criteria and identify edge cases early. A question answered in planning saves three bug reports in testing.
2. **Estimate testing effort** — can I reuse existing automation? If yes, the effort is low. If I need new test cases, I estimate how many and whether they can be automated this sprint or need to be manual.
3. **Define regression scope** — what existing features could this change break? Those specs run at minimum.
4. **Confirm environment readiness** — test accounts, database seed data, external API mocks or real connections, and feature flags must be ready before testing begins. A dependency discovered on day 4 of a 5-day sprint kills quality.

Trade-off: thorough planning takes time but saves far more time in testing. Skipping this step leads to last-minute surprises and deferred defects.

### My Experience
In practice I check which Cypress spec files cover the user story being modified. If a new feature touches the transactions flow, I identify which of the 9 API specs and 7 UI specs overlap with that data model and mark them as high-priority regression targets for that sprint.

I also add a Jira task alongside the dev task: *"Update/add Cypress automation for Story X."* This makes test automation a sprint deliverable, not an afterthought. When the story is done, both the feature and its automated test coverage are done.

---

## Q3. What are some types of different testing strategies?

### Direct Answer *(30 seconds)*
I use a layered strategy: unit tests at the base, API/integration tests in the middle, E2E tests at the top, with performance and security testing running alongside. Each layer catches different categories of defects at different costs.

### Concept & Reasoning

**Testing levels:**

| Level | What it tests | Who runs it | When |
|---|---|---|---|
| Unit | Smallest function or method in isolation | Developer | During development |
| Integration | Modules working together (API ↔ Database) | Dev + QA | After unit testing |
| System | Full application against business requirements | QA | After integration |
| UAT | Real business scenarios with real users | Business / PO | Before production |

**Testing types:**

| Type | What it tests | Key tool |
|---|---|---|
| Smoke | Critical paths — is the build stable? | Cypress (2 spec files) |
| Regression | Full suite — did any existing features break? | Cypress (21 spec files) |
| API | REST endpoints — status, body, schema, auth, DB state | Cypress `cy.request()` |
| UI / E2E | Real user workflows in a browser | Cypress |
| Performance | Response time, throughput, scalability under load | k6 |
| Security | OWASP Top 10 — XSS, injection, auth flaws | OWASP ZAP |

The testing pyramid principle: many unit tests (cheap, fast, isolated), fewer integration tests, even fewer E2E. E2E tests are the most expensive to write and maintain — use them for critical business workflows, not every edge case.

### My Experience
This project runs all four testing types in a single GitHub Actions pipeline:
- **Smoke** (Stage 1): `auth.spec.ts` + `bankaccounts.spec.ts` — runs in ~2 minutes, gates the full regression
- **Regression** (Stage 2): 21 spec files, 2 parallel containers, ~15 minutes
- **Performance** (Stage 3): k6 load test — 20 VUs, `p(95) < 500ms` threshold
- **Security** (Stage 4): OWASP ZAP baseline scan, HTML report uploaded as artifact

Fail-fast design: if smoke fails, regression does not run — saves the team 15+ minutes on a broken build.

---

## Q4. What tools and languages have you used for test automation?

### Direct Answer *(30 seconds)*
Cypress and TypeScript for UI and API testing, k6 for performance, OWASP ZAP for security, GitHub Actions for CI/CD, Jira and Xray for test management. Previously: Selenium, Robot Framework (Python), MSTest and SpecFlow (C#), Azure DevOps.

### Concept & Reasoning
Tool selection should match the tech stack and team maturity:

- **Cypress** — best for web UI and API testing in JavaScript/TypeScript teams. Real browser, time-travel debugging, built-in retry, network interception.
- **Selenium** — more language-flexible (Java, C#, Python), but requires more setup and is slower than Cypress.
- **k6** — load testing with JavaScript scripts, CI-friendly, no GUI required, outputs JSON metrics.
- **OWASP ZAP** — free DAST scanner, finds OWASP Top 10 vulnerabilities dynamically by probing a running app.
- **Robot Framework** — keyword-driven, good for teams with mixed technical backgrounds, integrates with Python libraries.
- **Postman** — API testing with a GUI, good for exploratory API testing; Newman CLI for CI integration.

Language choice: follow the application. TypeScript project → TypeScript tests share type definitions with the app, catch type mismatches at compile time.

### My Experience
**Current project (cypress-realworld-app):**
- Cypress 15 + TypeScript (21 spec files, 111 tests)
- k6 (JavaScript) — load test with ramp-up/hold/ramp-down stages
- OWASP ZAP — baseline scan via `zaproxy/action-baseline` GitHub Action
- GitHub Actions — 4-stage CI/CD pipeline
- Jira + Xray Cloud — results imported via PowerShell script
- PowerShell 5.1 — upload script with JWT auth, file validation, logging, try/catch

**Previous experience:**
- Azure DevOps + MSTest + SpecFlow (C#) — BDD-style tests for enterprise .NET applications
- Robot Framework + Python — AVEVA OASyS SCADA platform automation
- Selenium WebDriver — cross-browser UI testing
- Postman + Newman — REST API contract testing

---

## Q5. How do you decide what to automate and what to test manually?

### Direct Answer *(30 seconds)*
I automate stable, repetitive, high-risk regression tests. I keep manual testing for exploratory, visual, and rapidly-changing features, and anything that requires human judgment.

### Concept & Reasoning
**Automate when:**
- The test runs every sprint without change
- The behavior is deterministic (same input → same output every time)
- The setup and teardown are reliable and scriptable
- The cost of manual execution exceeds the cost of automation in 3 sprints or less

**Keep manual when:**
- The feature changes every sprint (automation becomes a maintenance burden)
- The test requires visual/UX judgment (does this look right?)
- It is exploratory — you are discovering behaviors, not verifying known ones
- The setup involves humans: MFA, CAPTCHA, physical hardware, real bank transfers

**Never automate:**
- CAPTCHA — designed to prevent automation
- MFA via a real mobile device — token expires, timing is unreliable
- One-time migration scripts — no repeatable value

Simple rule: *if a test ran manually 3+ sprints in a row without change, it is a candidate for automation.*

### My Experience
In the SSO scenario I worked on, the full login flow was **App → Keycloak → Azure AD → MFA → CAPTCHA → App**. I split it into two tracks:

- **Automated (bulk of tests):** `cy.loginByApi()` calls the Keycloak token endpoint directly, gets a JWT, sets it in `localStorage`, and `cy.session()` caches the authenticated state for the rest of the spec file. Fast, reliable, no MFA or CAPTCHA involved.
- **Manual (one real smoke test):** A QA engineer walks the full flow on UAT — real Keycloak, real Azure AD, real MFA, real CAPTCHA — before every production release.

This split gave us a reliable 111-test CI suite running in under 30 minutes, plus real-world SSO validation by a human at the right gate.

---

## Q6. Have you integrated your test automation with CI/CD pipelines?

### Direct Answer *(30 seconds)*
Yes. I built a 4-stage GitHub Actions pipeline: smoke tests gate the full regression, regression runs in parallel across 2 containers, performance (k6) and security (OWASP ZAP) run after regression passes.

### Concept & Reasoning
A good CI/CD pipeline for testing has three design principles:

1. **Fail fast** — run the cheapest, most critical tests first. If smoke fails, stop — do not waste time on regression.
2. **Parallel execution** — split the regression suite across multiple runners. More runners = shorter wall-clock time. Use Cypress Cloud or similar for spec assignment by historical duration.
3. **Conditional steps** — artifacts, reruns, and notifications should only trigger when relevant. Upload screenshots only on failure. Run security scans only on `main` branch. These decisions keep CI clean and cheap.

### My Experience
Pipeline structure (`.github/workflows/cypress.yml`):

```
Stage 1 — smoke      (timeout: 10 min)
  └── auth.spec.ts + bankaccounts.spec.ts
        ↓ (gates everything below)

Stage 2 — regression (timeout: 30 min, 2 parallel containers)
  ├── 21 spec files split by Cypress Cloud across 2 runners
  ├── Upload HTML + JSON reports (always)
  ├── Upload screenshots (only on failure)
  ├── Find failed specs → parse mochawesome JSON
  └── Rerun failed specs with video (only if failures exist)
        ↓

Stage 3 — performance (timeout: 20 min)
  └── k6: 20 VUs, p(95) < 500ms, error rate < 1%

Stage 4 — security   (timeout: 30 min, main branch only)
  └── OWASP ZAP baseline scan → HTML report artifact
```

The rerun pattern uses two gates before recording video:
- `if: failure()` — skips entirely on a green run
- `steps.failed.outputs.specs != ''` — skips if the job failed for infrastructure reasons (no test failures in the JSON)

This cut artifact storage by approximately 90% compared to uploading all videos for all tests.

---

## Q7. What is your approach to test data management in automation?

### Direct Answer *(30 seconds)*
I reset the database to a known state before every test, never hardcode test data in spec files, use seed files for deterministic fixtures, and use faker.js for dynamic data that must be unique.

### Concept & Reasoning
Test data management is where many suites fail long-term. The core problems are:

- **Shared mutable state** — test A creates a record that test B relies on. When A fails or runs in a different order, B breaks. Solution: each test owns its own setup and teardown.
- **Hardcoded data** — `username: "john_doe"` works until someone deletes that user. Solution: pull from the seed layer dynamically.
- **Data conflicts** — `POST /transactions` with `amount: 100` every test → duplicate records accumulate. Solution: use `faker.js` for unique-per-run values.
- **Production data in tests** — never. Use a dedicated test environment with a separate database.

Pattern: `beforeEach → db:seed (reset) → query seed for fixtures → run test → assert`.

### My Experience
This project uses a real Express backend with a `lowdb` (file-based) database. The test data flow is:

```
spec: cy.task("db:seed")
  ↓ browser → Node IPC (cy.task is the only bridge)
cypress.config.ts setupNodeEvents
  ↓ axios.post("http://localhost:3001/testData/seed")
backend/testdata-routes.ts
  ↓ seedDatabase() reads data/database-seed.json
  ↓ writes to data/database.json
  ↓ HTTP 200 back to spec
```

Then to get a valid user without hardcoding:
```ts
cy.database("filter", "users").then((users: User[]) => {
  ctx.authenticatedUser = users[0];  // always the seeded first user
  cy.loginByApi(ctx.authenticatedUser.username);
});
```

For dynamic data in API tests:
```ts
const getFakeAmount = () => parseInt(faker.finance.amount(), 10);
```

Nothing is mocked at the data layer — Cypress tests a real running Express server with a real file database, reset to a deterministic state before every test. This means test failures are real application failures, not artifacts of stale data.

---

## Q8. Can you explain how you handled test failures in your automation suite?

### Direct Answer *(30 seconds)*
I first classify the failure: app bug, test script issue, environment problem, or flaky test. Each category has a different fix. I never suppress a failure without understanding its root cause.

### Concept & Reasoning
**Classification matters because the fix is different:**

| Failure type | Symptom | Fix |
|---|---|---|
| App bug | Consistent failure, reproduces manually | Log in Jira with steps + evidence |
| Script issue | Selector changed, assertion wrong | Update the test, not the app |
| Environment issue | Passes locally, fails in CI | Check logs before the test step (port, npm, network) |
| Flaky test | Passes sometimes, fails sometimes | Fix race condition — do not just retry |

**Evidence to collect:** screenshot (auto-captured on failure), video (from rerun), network request log, console errors, CI step output above the test failure.

**Do not:** add `cy.wait(2000)` to fix a timing issue. That is a band-aid that makes the suite slower and still fails under load. Fix the root cause: replace `wait(ms)` with `cy.intercept().wait('@alias')`.

### My Experience
In CI, this project uses a two-stage evidence strategy:

1. **First run** — `screenshotOnRunFailure: true` (Cypress default). Screenshot is taken automatically for every failing test. Uploaded as a GitHub Actions artifact only when the job fails — zero overhead on passing runs.

2. **Rerun failed specs with video** — conditional steps inside the regression job parse the mochawesome JSON, find the spec files with at least one failing test, and rerun only those specs with `CYPRESS_VIDEO: "true"`. Video is uploaded only if the rerun also has failures.

Failed test results are imported to Jira via Xray. The HTML mochawesome report (with embedded screenshots) is attached to the Test Execution issue (SCRUM-8) so the developer can open the full visual report directly from Jira without downloading a CI artifact.

Log file written per upload run: `logs/xray-upload-<timestamp>.log` — contains HTTP status, full API response body, token preview — useful for diagnosing CI failures without re-running the suite.

---

## Q9. What types of testing have you automated — UI, API, database, performance?

### Direct Answer *(30 seconds)*
UI E2E, API, database state validation, smoke, regression, performance with k6, and security with OWASP ZAP — all running in a single CI/CD pipeline.

### Concept & Reasoning
Each testing type catches a different class of defect:

- **UI/E2E** — catches broken user workflows, JavaScript errors, rendering issues, and navigation bugs that only appear in a real browser.
- **API** — faster than UI, catches broken endpoints, wrong status codes, missing validation, authentication failures, and schema changes.
- **Database validation** — after a `POST` or `PUT`, query the database directly to confirm the record was actually written correctly. An API can return `200` with the right body while writing garbage to the database.
- **Performance** — catches slow queries, connection pool exhaustion, and throughput regressions that only appear under load.
- **Security** — DAST scanning catches vulnerabilities that appear at runtime: missing security headers, XSS injection points, unauthenticated endpoints.

### My Experience
| Type | Files | Count |
|---|---|---|
| UI E2E | `cypress/tests/ui/` | 7 spec files |
| API | `cypress/tests/api/` | 9 spec files (bank accounts, transfers, comments, contacts, likes, notifications, test data, transactions, users) |
| SSO / Auth providers | `cypress/tests/ui-auth-providers/` | 4 spec files (Auth0, Cognito, Google, Okta) |
| Performance | `cypress/tests/performance/load-test.spec.ts` | k6 — 20 VUs, p(95) < 500ms |
| Security | OWASP ZAP via GitHub Action | Baseline DAST scan |

API specs seed the database in `beforeEach`, call the endpoint with `cy.request()`, assert the response, then call `cy.database()` to confirm the database state changed correctly — not just that the API said it did.

---

## Q10. Can you describe your experience with API automation testing?

### Direct Answer *(30 seconds)*
I test REST APIs by covering all HTTP methods, validating status codes, response body and schema, authentication, error handling, and database state after mutations.

### Concept & Reasoning
A complete API test covers more than just the happy path:

- **Status codes** — `200` for success, `201` for created, `400` for bad input, `401` for no token, `403` for wrong role, `404` for missing resource
- **Response body** — correct shape, correct values, no extra sensitive fields leaked
- **Authentication** — does the endpoint reject requests with no token? Wrong token? Expired token?
- **Validation** — does the API reject bad input with a useful error message?
- **Database state** — after `POST /transactions`, does the record actually exist in the database with the correct values? An API can lie in its response.
- **Schema** — does the response contract match what the frontend expects? A field renamed on the backend breaks the UI silently.

### My Experience
Nine API spec files in `cypress/tests/api/`, one per domain entity. The pattern used in every spec:

```ts
beforeEach(() => {
  cy.task("db:seed");                             // reset to known state
  cy.database("filter", "users").then((users) => {
    ctx.authenticatedUser = users[0];
    cy.loginByApi(ctx.authenticatedUser.username); // authenticate without UI
  });
});

it("creates a transaction", () => {
  cy.request("POST", apiTransactions, {
    senderId: ctx.authenticatedUser.id,
    receiverId: ctx.receiver.id,
    amount: getFakeAmount(),
    description: "Test payment",
    transactionType: "payment",
  }).then((response) => {
    expect(response.status).to.eq(200);                    // status code
    expect(response.body.transaction.id).to.exist;         // response shape
  });

  cy.database("find", "transactions").then((tx) => {
    expect(tx.senderId).to.eq(ctx.authenticatedUser.id);   // DB state confirmed
  });
});
```

`cy.loginByApi()` posts directly to `/login` — no browser interaction, no UI wait time. This makes the 9 API spec files the fastest part of the suite, running in parallel across both CI containers.

---

## Q11. Have you ever written custom utilities or wrappers for your automation framework?

### Direct Answer *(30 seconds)*
Yes. I created a library of custom Cypress commands that serve as the abstraction layer for the entire test suite — replacing Page Objects with composable, reusable commands in `cypress/support/commands.ts`.

### Concept & Reasoning
Custom utilities solve three problems:

1. **DRY (Don't Repeat Yourself)** — login logic written once in `commands.ts`, called everywhere as `cy.login(username, password)`. If the login flow changes, one file changes, not 20 spec files.
2. **Readability** — `cy.getBySel("signin-username").type(username)` is more readable and maintainable than `cy.get('[data-test=signin-username]').type(username)` repeated 40 times.
3. **Stability** — wrapping selectors in `data-test` attribute queries (`getBySel`) means CSS class and ID changes in the app never break tests.

Custom commands are an alternative to the **Page Object Model (POM)**. POM uses classes with methods; custom Cypress commands use the `cy.` chain syntax. Both achieve the same goal — one is more idiomatic for Cypress.

### My Experience
From `cypress/support/commands.ts` — 10+ custom commands:

| Command | What it does |
|---|---|
| `cy.getBySel(selector)` | Wraps `cy.get('[data-test=selector]')` — stable, CSS-change-proof |
| `cy.getBySelLike(selector)` | Wraps `cy.get('[data-test*=selector]')` — partial match |
| `cy.login(username, password)` | Full UI login with intercept, snapshot logging, and `rememberUser` support |
| `cy.loginByApi(username)` | POST to `/login` — no browser, used in API specs |
| `cy.loginByXstate(username)` | Drives login via XState state machine — fires `authService.send("LOGIN")` directly |
| `cy.database(op, entity)` | Wraps `cy.task("find:database")` / `"filter:database"` — readable fixture queries |
| `cy.createTransaction(payload)` | Fires `createTransactionService.send("CREATE")` — creates test data without UI |
| `cy.switchUserByXstate(username)` | Logout + login as a different user in one command |
| `cy.visualSnapshot(name)` | Percy visual snapshot with auto-generated name from test title |
| `cy.setTransactionAmountRange(min, max)` | Drives a React slider via internal `memoizedProps` — no DOM drag needed |

The `loginByApi` and `loginByXstate` commands show two different strategies: one hits the REST endpoint directly, the other fires the XState machine event — useful for testing both the API contract and the state machine behavior independently.

---

## Q12. When would you use an array versus an ArrayList?

### Direct Answer *(30 seconds)*
Array is fixed-size and faster; ArrayList (Java/C#) is dynamic and flexible. In TypeScript and JavaScript, arrays are already dynamic — choose between `Array`, `Set`, and `Map` based on whether you need uniqueness or key-value lookup.

### Concept & Reasoning
**Java / C# context (original question):**

| Type | Size | Performance | Use when |
|---|---|---|---|
| `int[]` / `string[]` | Fixed at creation | Faster — no resize overhead | Size is known, performance-critical |
| `ArrayList` / `List<T>` | Dynamic — grows automatically | Slightly slower | Size unknown, elements added/removed often |

**TypeScript / JavaScript equivalent:**

| Type | Behavior | Use when |
|---|---|---|
| `string[]` / `Array<string>` | Dynamic, ordered, allows duplicates | Most cases — default choice |
| `Set<string>` | Dynamic, **unique values only**, O(1) lookup | Deduplication, membership checks |
| `Map<K, V>` | Key-value pairs, typed keys | Lookup by dynamic key, replacing plain objects |
| `readonly string[]` or tuple `[string, number]` | Immutable / fixed-length | Configuration, function return types you won't change |

Trade-off: `Set` does not have index access (`set[0]` does not work) — spread it to an array when you need index or order: `[...mySet]`.

### My Experience
In the GitHub Actions rerun script, I used a JavaScript `Set` to collect unique failed spec file paths parsed from the mochawesome JSON reports:

```js
const failed = new Set();
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync("cypress/logs/" + f, "utf8"));
  (data.results || []).forEach(r => {
    const hasFail = (suites) => (suites || []).some(s =>
      (s.tests || []).some(t => t.fail) || hasFail(s.suites));
    if (hasFail(r.suites || [])) failed.add(r.file);
  });
});
console.log([...failed].join(","));
```

`Set` auto-deduplicates — the same spec file is not added twice even if it contains multiple failing tests. Then `[...failed]` spreads it into an array to call `.join(",")` for the Cypress `--spec` argument. If I had used a plain array, I would need a manual deduplication step.

---

## Q13. What is a test automation framework and what are its key components?

### Direct Answer *(30 seconds)*
A framework is the structure that organizes and runs tests consistently. Its key components are: test runner, test scripts, assertions, reporting, logging, test data management, reusable utilities, configuration, and CI/CD integration.

### Concept & Reasoning
Without a framework, each test file is an island — different patterns, hardcoded data, no shared setup, no reporting. A framework creates one way of doing things so any team member can read, write, and maintain any test.

**Key components and why each matters:**

| Component | Purpose |
|---|---|
| **Test runner** | Discovers and executes tests, manages lifecycle hooks |
| **Test scripts** | The actual spec files — organized by type or domain |
| **Assertions** | Validates expected vs actual — the heart of every test |
| **Reporting** | Human-readable output (HTML) + machine-readable (JSON for CI/Xray) |
| **Logging** | Records what happened during a run — critical for CI debugging |
| **Configuration** | One source of truth for baseUrl, timeouts, reporter, spec patterns |
| **Test data** | Seed files, factories, dynamic generators — keeps tests independent |
| **Utilities** | Shared commands and helpers — DRY principle |
| **CI/CD integration** | Automated trigger — tests run on every commit, not just manually |
| **Test management** | Tracks pass/fail history, links results to requirements |

### My Experience
This project maps every component to a specific file:

| Component | File / Tool |
|---|---|
| Test runner | Cypress 15 |
| Test scripts | `cypress/tests/ui/` (7 files) + `cypress/tests/api/` (9 files) |
| Assertions | Chai — `.should("eq", 200)`, `expect(response.status).to.eq(201)` |
| Reporting | `cypress-mochawesome-reporter` → `cypress/logs/*.html + *.json` |
| Logging | `Write-Log` in `scripts/Upload-XrayResult.ps1` → `logs/xray-upload-<ts>.log` |
| Configuration | `cypress.config.ts` — E2E + component blocks, expose, tasks, reporter options |
| Test data | `data/database-seed.json` + `faker.js` + `cy.task("db:seed")` |
| Utilities | `cypress/support/commands.ts` — 10+ custom commands |
| CI/CD | `.github/workflows/cypress.yml` — 4-stage pipeline |
| Test management | Jira + Xray Cloud — results imported via `Upload-XrayResult.ps1` |

One architectural decision worth calling out: `cypress.config.ts` is the map for the entire framework. It defines two test types (E2E and component), all Node-side tasks (`db:seed`, `find:database`, SSO credentials), all config values exposed to the browser (`apiUrl`, breakpoints), and the reporter. Everything traces back to that one file.

---

## Q14. What is black-box testing and white-box testing, and when would you use each?

### Direct Answer *(30 seconds)*
Black-box tests behavior from the outside without knowing the source code — QA perspective. White-box tests internal logic and code paths — developer perspective. They complement each other: black-box tells you something is wrong, white-box tells you exactly where.

### Concept & Reasoning
**Black-box testing:**
- You provide input, observe output, and verify it matches the requirement.
- You do not know (or care) what happens inside.
- Used for: E2E tests, API tests, manual testing, UAT.
- Strength: tests what the user actually experiences.
- Weakness: when it fails, the cause could be anywhere in the stack.

**White-box testing:**
- You know the code and test specific branches, conditions, and internal functions in isolation.
- Used for: unit tests, code coverage analysis.
- Strength: pinpoints exactly which function failed.
- Weakness: does not test how components interact.

**Testing pyramid principle:**
```
        Black-box: E2E / Cypress  (few — slow, expensive)
                     ▲
        Mixed: Integration / API
                     ▲
        White-box: Unit / Jest   (many — fast, cheap)
```

### My Experience
A concrete example from this codebase in `backend/database.ts`:

```ts
export const getTransactionsForUserForApi = (userId: string, query?: object) =>
  flow(getTransactionsForUserByObj(userId), formatTransactionsForApiResponse)(query);
```

`flow()` composes two functions — the query filter and the response formatter — into one exported function.

**Black-box (what our Cypress API test sees):**
```ts
cy.request("GET", `/transactions`).then((response) => {
  expect(response.status).to.eq(200);
  expect(response.body.results[0]).to.satisfy(isSenderOrReceiver);
});
```
If this fails, you know the output is wrong — but not whether `getTransactionsForUserByObj` filtered incorrectly, or `formatTransactionsForApiResponse` formatted incorrectly, or the database returned bad data.

**White-box (unit tests for each function):**
```ts
describe("getTransactionsForUserByObj", () => {
  it("returns only transactions where user is sender or receiver", () => {
    const result = getTransactionsForUserByObj(userId)(mockQuery);
    expect(result.every(isSenderOrReceiver)).to.be.true;
  });
});
```
Now if the API test fails, the unit test tells you exactly which building block broke. In this project, Cypress covers the black-box E2E and API layer; Jest/Vitest would cover the white-box unit layer for these backend functions.

---

## Q15. We have an application that needs to handle 75,000 concurrent requests. How would you test it?

### Direct Answer *(30 seconds)*
I define the performance goals first, then run four types of tests: load (can it handle 75k?), stress (where does it break?), spike (can it recover from a sudden burst?), and endurance (does it hold up for hours?). I use k6 or JMeter and monitor CPU, memory, database connections, and error rates throughout.

### Concept & Reasoning
**Four test types, four different questions:**

| Type | Question | Pattern |
|---|---|---|
| **Load** | Does it meet the SLA at 75k req/min? | Ramp up to target, hold, ramp down |
| **Stress** | Where is the breaking point? | Ramp past 75k until failure |
| **Spike** | Can it absorb a sudden burst and recover? | Instant jump to 75k, then drop |
| **Endurance** | Does memory or DB connections degrade over hours? | Low VU count for 2+ hours |

**What to monitor:**
- Response time (p50, p95, p99)
- Error rate (HTTP 5xx, timeouts)
- Server CPU and memory
- Database connection pool usage
- Thread pool / worker queue depth

**Performance thresholds should be defined before the test**, not discovered during it. Example: "95% of requests must complete in under 500ms; error rate must stay below 1%."

k6 stages configuration for each type:
```js
// Load — normal expected traffic
stages: [
  { duration: "1m", target: 75000 },   // ramp up
  { duration: "5m", target: 75000 },   // hold
  { duration: "1m", target: 0 },       // ramp down
]

// Stress — find breaking point
stages: [
  { duration: "5m", target: 150000 },  // push past limit
]

// Spike — flash sale / viral event simulation
stages: [
  { duration: "10s", target: 75000 },  // instant burst
  { duration: "1m",  target: 0 },      // recover
]

// Endurance — memory leak / connection exhaustion
stages: [
  { duration: "2h", target: 1000 },    // steady low load for hours
]
```

### My Experience
Built a k6 load test for this project targeting the Express backend at port 3001:

```ts
export const options = {
  stages: [
    { duration: "10s", target: 20 },   // ramp up to 20 VUs
    { duration: "30s", target: 20 },   // hold
    { duration: "10s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // 95% of requests under 500ms
    http_req_failed:   ["rate<0.01"],  // less than 1% error rate
  },
};
```

The k6 test runs in the CI pipeline after regression passes. If the p(95) threshold breaches 500ms or error rate climbs above 1%, the CI stage fails and the team is notified before the code ships to production.

For 75k concurrent users specifically: increase the `target` in the stages config, point k6 at a UAT environment with production-scale infrastructure, and monitor the backend with a tool like Grafana or Datadog during the run. k6 is a plain Go process — it does not use a browser and bypasses CORS, so it hits the API directly at maximum throughput.

---

## Q16. What percentage of an application needs to be tested with automation?

### Direct Answer *(30 seconds)*
There is no fixed number. Around 70–80% is a practical target. Automate stable, high-value regression. Keep exploratory, visual, and one-time testing manual.

### Concept & Reasoning
The question behind the question is: *are you automating the right things?* A suite that is 100% automated but tests trivial paths while skipping business-critical flows is worse than a 60% suite that covers the highest-risk scenarios.

**What to count toward the target:**
- All regression scenarios that run every sprint
- All API contract tests
- All smoke tests
- All data-driven scenarios (same test logic, different inputs)

**What not to automate (and why):**
- Exploratory testing — by definition, you are discovering unknown behavior
- Visual/UX acceptance — "does this look right?" requires a human
- CAPTCHA, MFA, third-party OAuth — designed to prevent automation
- One-time migration or data-cleanup scripts — no repeat value

**The real metric to track:** regression execution time. If your manual regression takes 3 days per sprint, 70% automation cuts it to less than 1 day. That is the business case.

### My Experience
In this project, the regression suite covers 111 tests across all business-critical flows: authentication, bank accounts, transactions, notifications, contacts, user settings. That represents approximately 75–80% of the application's testable behavior.

The remaining 20% is intentionally manual:
- Visual design acceptance (Percy snapshots exist but require human review)
- Real SSO with MFA and CAPTCHA on UAT
- Exploratory testing of new features in the first sprint

The guiding rule I use: *if a test ran manually 3 or more consecutive sprints without changing, it belongs in automation.*

---

## Q17. Describe a project and what role you played as a QA.

### Direct Answer *(30 seconds)*
I built and maintain this Cypress real-world banking app — a full-stack React + Express application with 111 automated tests, a 4-stage CI/CD pipeline, Xray integration, and a PowerShell upload script. Previously I worked on the AVEVA OASyS SCADA platform using Python and Robot Framework.

### Concept & Reasoning
When describing a project in an interview, cover four things:
1. **What the application does** — give context for why quality matters
2. **Your specific role** — not "the team did X" but "I built X"
3. **The tech stack** — tools, languages, CI/CD
4. **The measurable outcome** — time saved, bugs caught, test coverage achieved

### My Experience — This Project (cypress-realworld-app)

**Application:** A full-stack banking web app — React frontend (port 3000), Express REST API backend (port 3001), lowdb file-based database (`data/database.json`). Used as a realistic Cypress reference app covering real-world patterns: authentication, bank account management, peer-to-peer transactions, notifications.

**My role:** Built the full QA automation layer from scratch.

**What I built:**
- 21 automated spec files: 9 API + 7 UI + 4 SSO provider + 1 demo
- 111 tests covering authentication, bank accounts, transactions, notifications, contacts, user settings
- 4-stage GitHub Actions pipeline: smoke → regression (2 parallel containers) → performance → security
- Cypress mochawesome reporter: HTML report + JSON for Xray import
- PowerShell upload script: JWT auth → mochawesome-to-Xray conversion → POST to Xray Cloud → attach HTML to Jira issue
- Failed-test-only artifact pattern: screenshots on failure, conditional video rerun — cut artifact storage by ~90%
- k6 load test with `p(95) < 500ms` threshold
- OWASP ZAP security scan on `main` branch

**Previous project — AVEVA OASyS SCADA:**
- Industrial control system (SCADA) platform — high reliability requirements, used in oil and gas pipelines
- Python + Robot Framework for automated regression
- Azure DevOps CI/CD pipeline
- Created test cases, executed manual and automated tests, validated APIs and database writes
- Logged and tracked defects in Jira, supported sprint planning with developers and the Product Owner

---

## Q18. What would you focus on during testing any project?

### Direct Answer *(30 seconds)*
I focus in order of risk: critical business workflows first, then high-risk changes, then integration points between services, then data accuracy, performance, and security.

### Concept & Reasoning
Testing everything equally is not possible — time and risk must be matched. Risk-based testing prioritizes where failures cost the most:

1. **Critical business workflows** — login, core transaction, payment, data submission. If these break, users cannot use the product.
2. **High-risk areas** — recently changed code, new features, complex business logic. New code has the highest defect density.
3. **Integration points** — API ↔ database, frontend ↔ backend, third-party services. Integration failures are the hardest to diagnose.
4. **Data accuracy** — does the database contain what the API reported? A silent data corruption bug can be catastrophic.
5. **Performance** — does the system meet its SLA under expected load?
6. **Security** — are authentication, authorization, and input validation correct?
7. **Regression** — did any existing features break due to this change?
8. **User experience** — does the UI behave correctly across viewports and browsers?

### My Experience
In CI, the pipeline structure reflects this priority order directly:

- **Smoke first** — `auth.spec.ts` and `bankaccounts.spec.ts` run in Stage 1. If the most critical paths (login, account creation) are broken, the entire pipeline stops. No point running 19 more spec files against a broken core.
- **Regression second** — 21 spec files across all domains run in parallel. Each container uploads its own JSON and HTML report. Failed tests are identified and retested automatically.
- **Performance third** — only meaningful after the app is functionally correct. A broken endpoint that responds in 5ms is not a performance win.
- **Security last** — gated behind regression, runs only on `main` branch. Feature branch noise is filtered out.

For new feature testing, I check which spec files share the same data model as the new feature and add those to the high-priority regression list for that sprint.

---

## Q19. How would you test an app developed using AI, and how would you use AI during testing?

### Direct Answer *(30 seconds)*
Testing an AI app means validating accuracy, consistency, safety, latency, and edge-case behavior — since AI output is non-deterministic, you assert response structure and quality, not exact strings. I also use AI tools like Claude to generate test cases, analyze failures, and write automation code.

### Concept & Reasoning
**Testing an AI-powered application:**

Traditional assertion: `expect(response.body.answer).to.eq("Paris")` — this fails when the AI rephrases the answer. AI testing requires different strategies:

| What to test | How to test it |
|---|---|
| Response structure | Assert JSON schema, required fields exist |
| Accuracy / relevance | Compare against a known-good golden dataset |
| Consistency | Send the same prompt 10 times — does it give contradictory answers? |
| Safety / content policy | Send adversarial prompts — does it refuse correctly? |
| Hallucination | Ask about facts and verify against a trusted source |
| Latency | Assert `response.timings.duration < 2000ms` under normal load |
| Bias | Test with prompts that vary only by demographic — assert consistent treatment |

**Using AI during the testing process:**

- **Test case generation** — describe the feature to Claude/ChatGPT, ask for 20 edge cases. Review and implement the valuable ones.
- **Failure analysis** — paste a test failure log, ask for root cause. Faster than manual log reading.
- **Code generation** — describe the automation task (e.g., "write a Cypress command that intercepts POST /login and asserts the response token starts with eyJ"), get a working draft.
- **Documentation** — describe the test architecture, ask for a summary for new team members.

### My Experience
I used Claude Code throughout this project:

- **Debugging** — when the Xray API returned a 404 for `/api/v2/import/execution/mocha`, I described the error to Claude, which identified that the Mocha-specific endpoint requires a paid plan tier and suggested switching to the generic `/api/v2/import/execution` endpoint with Xray native JSON format.
- **Script generation** — the PowerShell `Upload-XrayResult.ps1` script was generated with Claude assistance: JWT authentication, mochawesome-to-Xray JSON conversion, `curl.exe` for clean UTF-8 binary body, log writing, exit codes, and try/catch error handling.
- **CI/CD pattern** — Claude suggested the two-gate rerun pattern (`if: failure()` combined with `steps.failed.outputs.specs != ''`) to prevent the rerun step from executing on infrastructure failures where no test JSON exists.
- **Estimated time saved:** approximately 50% on non-test scripting tasks (CI YAML, PowerShell, documentation).

For test case ideas: I described the bank account API behavior to Claude and received a list of 15 edge cases. After reviewing, 12 were implemented — including the "renders an empty bank account list state with onboarding modal" test that requires `empty-seed.json` to be loaded instead of the default seed.

---

## Q20. How do you handle flaky tests?

### Direct Answer *(30 seconds)*
First I classify the flaky test — race condition, bad selector, shared mutable state, or real intermittent application bug. Then I fix the root cause. I never suppress flakiness with a retry without understanding why it is failing.

### Concept & Reasoning
**Most common causes of flaky tests and their fixes:**

| Cause | Symptom | Fix |
|---|---|---|
| Hardcoded `cy.wait(2000)` | Passes fast machines, fails slow CI | Replace with `cy.intercept().wait("@alias")` |
| CSS/class-based selectors | Breaks when dev renames a class | Use `data-test` attributes — these change only when behavior changes |
| Shared mutable state | Test B fails when test A runs first | Reset DB in `beforeEach` — each test owns its own state |
| Auth state leaking | Logged in as wrong user randomly | Use `cy.session()` to isolate auth state per spec file |
| Non-deterministic response order | Assertion fails when API returns data in different order | Sort before asserting, or assert membership not order |
| App truly intermittent | Passes 9/10 times — real race condition in the app | This is a bug — log it, do not work around it in the test |

**What not to do:**
- Do not add `cy.wait(5000)` — makes the suite slower and still fails under enough load
- Do not set `retries: 3` as a first response — retry masks the problem, it does not fix it
- Do not comment out the test — a skipped test is zero value and will never be fixed

`retries` config in Cypress is a last resort for truly intermittent third-party dependencies (payment provider, auth0 sandbox) where you cannot control the flakiness source.

### My Experience
**Problem 1 — Auth state leaking between tests:**
- Symptom: tests randomly started as the wrong user
- Root cause: `localStorage` not cleared between tests
- Fix: `cy.task("db:seed")` in every `beforeEach` resets the database AND clears session state. The seed flow goes: `cy.task("db:seed")` → Node IPC → `axios.post("/testData/seed")` → `seedDatabase()` → copies `database-seed.json` → `database.json`. Every test starts from the same known user set.

**Problem 2 — SSO token expiry mid-suite:**
- Symptom: auth-related specs failed intermittently when the Keycloak JWT expired between the `beforeEach` and the test assertion
- Fix: `cy.session([username], () => { ... })` caches the authenticated browser state. Cypress replays the session from cache for every test in the spec file. Only re-authenticates when the session expires. Eliminates the re-login cost and the expiry race condition.

**Problem 3 — CI infrastructure flakiness vs real test failures:**
- Symptom: CI job failed, but manual rerun passed — no test failure in the mochawesome JSON
- Root cause: `npm start` took longer than expected on a cold runner; app was not ready
- Fix: `wait-on-timeout: 60` on every Cypress action step. If `http://localhost:3000` does not respond within 60 seconds, the step fails immediately with a clear error — no hanging for 30 minutes. The rerun step also has a second gate: `steps.failed.outputs.specs != ''` ensures the rerun only runs when the mochawesome JSON actually contains failing specs, not when the job failed before any tests ran.

**Selector stability across the project:**
All selectors use `data-test` attributes via `cy.getBySel("signin-username")`. CSS class changes, component library upgrades, and layout refactors never break tests. If a `data-test` attribute disappears, the test fails for the right reason — the element is gone — not because a CSS class was renamed.
