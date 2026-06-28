# Cypress Architecture Walkthrough — starting from cypress.config.ts

A roadmap to narrate file-by-file, starting at `cypress.config.ts` and radiating outward.
Each stop says what to open and what to say about it.

## 1. cypress.config.ts — the root of everything

Open [cypress.config.ts](cypress.config.ts). Two separate testing types are defined in one config:

- `e2e` block ([line 68](cypress.config.ts#L68)) — full browser specs, `baseUrl: localhost:3000`,
  specs matched by `cypress/tests/**/*.spec.ts`
- `component` block ([line 55](cypress.config.ts#L55)) — mounts individual React components via
  Vite, specs matched by `src/**/*.cy.tsx` (lives *next to* the component, not in the cypress folder)

**Opening line:** "This isn't one test architecture, it's two — E2E and component testing,
configured side by side."

## 2. setupNodeEvents — the Node-side bridge (line 76)

The most interview-worthy block. Explain `cy.task()`:

- `"db:seed"` (line 89) — POSTs to the backend's `/testData/seed` endpoint, which calls
  `seedDatabase()` in [backend/database.ts](backend/database.ts) (confirmed via
  [backend/testdata-routes.ts:13](backend/testdata-routes.ts#L13)). **Key point: the seed isn't
  done by Cypress — Cypress just triggers a real backend endpoint that resets the lowdb file.**
  Node-side tasks exist because the browser can't directly hit the filesystem or do privileged setup.
- `"find:database"` / `"filter:database"` — same pattern, used by `cy.database()` custom command
  to pull seeded fixtures (e.g. grabbing a valid username) without hardcoding test data.
- `getAuth0Credentials` / `getOktaCredentials` / etc. — pulls real SSO credentials from
  environment variables server-side, so secrets never get baked into spec files.

## 3. expose — config exposed to the browser (line 29)

Replaces the old `Cypress.env()` pattern — `apiUrl`, viewport breakpoints, SSO domains/client IDs
get exposed once here and read in specs via `Cypress.expose("apiUrl")` (used in `auth.spec.ts:4`).
One config source of truth instead of scattered env reads.

## 4. supportFile → cypress/support/e2e.ts and commands.ts

Open [cypress/support/commands.ts](cypress/support/commands.ts). This is where custom commands
replace Page Objects: `cy.login()`, `cy.getBySel()`, `cy.database()`, `cy.loginByXstate()`.

**Line to say:** "Every spec calls into this file instead of a page-object class — this is the
abstraction layer."

## 5. specPattern → cypress/tests/

Walk the four subfolders and explain the *why* for each:

- `tests/ui/` — full browser E2E
- `tests/api/` — `cy.request()` only, no browser, fast
- `tests/ui-auth-providers/` — SSO variants, each pairs with a `support/auth-provider-commands/*.ts` file
- `tests/demo/` — Cypress Studio recording demo

## 6. Backend connection → backend/

Close the loop: specs hit `baseUrl:3000` (React/Vite) → Vite proxies auth/graphql calls to
`backend/app.ts` (Express, port 3001) → routes read/write `data/database.json` via lowdb.

**Line to say:** "There's no mocked backend — Cypress is testing a real running Express server
and a real (file-based) database, reset between tests via the task we saw in setupNodeEvents."

## 7. Wrap-up line

*"The config file is the map — it tells you there are two test types, that Node-side tasks
bridge the browser to a real backend for setup/teardown, and that env/secrets are centralized
via `expose` rather than scattered through specs."*

That's the one-sentence architecture summary if asked to summarize cold.
