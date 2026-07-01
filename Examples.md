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
