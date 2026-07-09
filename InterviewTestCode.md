# Cypress Interview Prep — Reading List

## empty-seed.json vs database.json

There's no separate "real db" being skipped — this app's entire database **is** a JSON
file, read/written via `lowdb` ([backend/database.ts](backend/database.ts)). No Postgres/Mongo anywhere.

- **`database.json`** — the live file the Express backend actually reads/writes while the
  app runs.
- **`database-seed.json`** — the "full" sample dataset (users, transactions, bank accounts,
  etc.). Copied → `database.json` before every normal dev/test run (`db:seed:dev` script,
  runs via `predev`/`prestart` hooks).
- **`empty-seed.json`** — a near-blank skeleton. Copied → `database.json` only when you run
  `yarn start:empty` (via `db:seed:empty`), to test the app's zero-data / onboarding states.

So: `database.json` = the actual running DB at any moment; the other two are just
swappable starting snapshots for it.

## One test per category — 2-3 hour reading list

| # | Category | File : line | Test |
|---|---|---|---|
| 1 | Data seed + DB query | [auth.spec.ts:26](cypress/tests/ui/auth.spec.ts#L26) | `"should redirect to the home page after login"` — shows `cy.database("find","users")` pulling a seeded user directly from `database.json` |
| 2 | Previous sign-in / session | [auth.spec.ts:33](cypress/tests/ui/auth.spec.ts#L33) | `"should remember a user for 30 days after login"` — `rememberUser`, cookie `expiry` check |
| 3 | Positive / happy path | [bankaccounts.spec.ts:45](cypress/tests/ui/bankaccounts.spec.ts#L45) | `"creates a new bank account"` — form fill, GraphQL mutation wait, assertion |
| 4 | Negative / validation | [bankaccounts.spec.ts:72](cypress/tests/ui/bankaccounts.spec.ts#L72) | `"should display bank account form errors"` — required-field and format errors |
| 5 | Edge case / empty state | [bankaccounts.spec.ts:157](cypress/tests/ui/bankaccounts.spec.ts#L157) | `"renders an empty bank account list state with onboarding modal"` — ties directly to the `empty-seed.json` concept above |
| 6 | Cross-cutting / multi-actor "exception" | [notifications.spec.ts:83](cypress/tests/ui/notifications.spec.ts#L83) | `"User C likes a transaction between User A and User B; User A and User B get notifications..."` — best one for explaining side-effect/notification testing |
| 7 | UI element / responsiveness | [transaction-feeds.spec.ts:68](cypress/tests/ui/transaction-feeds.spec.ts#L68) | `"toggles the navigation drawer"` — `isMobile()` pattern, viewport-driven assertions |
| 8 | Pagination / data-driven | [transaction-feeds.spec.ts:189](cypress/tests/ui/transaction-feeds.spec.ts#L189) | `"paginates {feedName} transaction feed"` — parametrized `.forEach` over feed types |

Suggested order: 1 → 2 (auth/session basics) → 3 → 4 (CRUD form pattern) → 5 (ties seed
files together) → 8 (data-driven pattern) → 7 (responsive testing) → 6 (most complex,
save for last). Roughly 15-20 min each including rereading `commands.ts` for unfamiliar
custom commands — fits a 2-3 hour block comfortably.

## commands.ts — custom Cypress commands

Key commands with one-line description each, from [cypress/support/commands.ts](cypress/support/commands.ts):

- `cy.getBySel(selector)` — query by `data-test` attribute
- `cy.loginByApi(username)` — bypass UI, POST /login directly
- `cy.loginByXstate(username)` — login via XState machine (fastest)
- `cy.database("find"|"filter", entity, query)` — query seeded DB
- `cy.createTransaction(payload)` — create transaction via API

## utils.ts + assertions.ts — helpers and assertion guards

[cypress/support/utils.ts](cypress/support/utils.ts):

- `generateUser()` — faker `{ firstName, lastName, username, password, email }`
- `formatDate(date)` — Date → `"YYYY-MM-DD"`
- `getFakeAmount()` — random int from faker.finance.amount()
- `isMobile()` — viewport width < mobileViewportWidthBreakpoint

[cypress/support/assertions.ts](cypress/support/assertions.ts):

- `isNonEmptyString(value)` — typeof string && trim > 0
- `isPositiveAmount(value)` — typeof number && > 0
- `isValidDate(value)` — typeof string && !isNaN(Date.parse)
- `isSenderOrReceiver(userId)` — checks senderId/receiverId on Transaction

## tasks.ts — Node bridge (cy.task)

From [cypress/support/tasks.ts](cypress/support/tasks.ts):

- `seed()` → `cy.task("db:seed")` → POST /testData/seed → resets database.json
- `findDatabase(entity, query?)` → first matching record
- `filterDatabase(entity, query?)` → all matching records
- `readFile(filePath)` → fs.readFileSync (browser has no filesystem access)

Demo: [cypress/tests/demo/custom-tasks.spec.ts](cypress/tests/demo/custom-tasks.spec.ts) — 4 tests exercising all 4 tasks

## interceptors.ts — network monitor and stub

Show the two patterns with inline comments, from [cypress/support/interceptors.ts](cypress/support/interceptors.ts):

```ts
// MONITOR — no 3rd arg → real request goes through, alias for cy.wait
cy.intercept("POST", "/login").as("loginUser");
cy.wait("@loginUser").then(i => expect(i.response.statusCode).to.eq(200));

// STUB — 3rd arg → fake response returned, backend never called
cy.intercept("GET", "/transactions*", { statusCode: 200, body: { results: [] } }).as("empty");
cy.wait("@empty");
```

Rule: declare BEFORE the action that triggers the request.

Grouped helpers in interceptors.ts:

- `interceptLogin()` — aliases @loginUser, @getUserProfile
- `interceptTransactions()` — aliases @getTransactions, @createTransaction, @updateTransaction
- `interceptBankAccounts()` — aliases @getBankAccounts, @createBankAccount, @deleteBankAccount
- `interceptNotifications()` — aliases @getNotifications, @updateNotification

Demo: [cypress/tests/demo/interceptors.spec.ts](cypress/tests/demo/interceptors.spec.ts) — 2 monitor + 3 stub tests

