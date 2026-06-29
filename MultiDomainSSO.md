# Multi-Domain SSO — Interview Q&A

## Question

Your application uses **App → Keycloak → Azure AD → MFA → CAPTCHA → App**. How would
you automate it?

## Answer

I wouldn't try to automate CAPTCHA or MFA because they are designed to prevent
automation and can make tests unreliable. I'd keep one or two smoke tests that verify
the complete authentication flow using the real identity provider.

For the remainder of the regression suite, I'd work with the development and Identity and Access Management teams
to use a programmatic authentication mechanism, such as a Keycloak test realm, an OAuth
token endpoint, or a dedicated test login API. The tests would request a fresh access
token or authenticated session at runtime, establish the application's authenticated
state (for example by setting the required JWT or authentication cookie), and then use
`cy.session()` to cache and reuse that authenticated browser session across tests. This
makes the test suite faster, more reliable, and suitable for CI/CD pipelines.

**Normal login flow**

```
App → Keycloak → Azure AD → MFA → CAPTCHA → App (Authenticated)
```

**Programmatic login (most Cypress tests)**

```
Cypress → Keycloak Token API → Fresh JWT/Auth Cookie → App (Authenticated)
```

**Real UI smoke test**

```
Cypress → App → Keycloak → Azure AD → MFA → CAPTCHA → App
```

**Typical CI/CD**

```
Developer → Deploy DEV → Cypress (Headless Chrome + Programmatic Login + Regression) → Deploy UAT (headless browser) → Manual QA (Real SSO, MFA, CAPTCHA, Accessibility, Exploratory Testing, Business Acceptance) → Production
```

## Example

```ts
Cypress.Commands.add("loginByApi", (username, password) => {
  cy.session([username], () => {
    cy.request("POST", "/oauth/token", {
      username,
      password,
      grant_type: "password",
    }).then(({ body }) => {
      window.localStorage.setItem("access_token", body.access_token);
    });
  });
});
```

*Note: Depending on the application's authentication design, the authenticated state
may be established using `localStorage`, `sessionStorage`, or secure HttpOnly cookies.*

### Retrieving the stored access token

```ts
cy.window().then((win) => {
  const accessToken = win.localStorage.getItem("access_token");
  cy.wrap(accessToken).should("exist");
});
```

To use it directly in a follow-up API call:

```ts
cy.window()
  .its("localStorage")
  .invoke("getItem", "access_token")
  .then((accessToken) => {
    cy.request({
      url: "/api/some-endpoint",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });
```

## Related

This repo's real-world equivalent of the "real UI smoke test" path is the `cy.origin()`
based Auth0 login in
[cypress/support/auth-provider-commands/auth0.ts:23](cypress/support/auth-provider-commands/auth0.ts#L23) —
see the `cy.origin()` write-up in [Improvement.md](Improvement.md) for why cross-origin
UI automation needed that API in the first place. Programmatic login (this doc) is the
strategy for *avoiding* needing `cy.origin()` for the bulk of the suite.
