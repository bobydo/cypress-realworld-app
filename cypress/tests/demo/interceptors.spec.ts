// Demonstrates cy.intercept() — two patterns:
//
//   MONITOR — observe real network traffic without changing it
//             use cy.wait("@alias") to block until the request completes
//             then inspect status code, body, headers, timing
//
//   STUB    — intercept before the request reaches the backend
//             return fake data instead — no real HTTP call made
//             useful for testing error states, loading states, edge cases

import { cyreal } from "../../support";

describe("Interceptors — monitor and stub demo", () => {

  // ── MONITOR — observe real /login request ──────────────────────────────────
  describe("Monitor", () => {

    it("observes the real POST /login request and asserts the response", () => {
      cy.task("db:seed");

      // Declare the listener BEFORE the action that triggers the request
      cy.intercept("POST", "/login").as("loginRequest");

      cy.visit("/signin");
      cy.getBySel("signin-username").type("Katharina_Bernier");
      cy.getBySel("signin-password").type("s3cret");
      cy.getBySel("signin-submit").click();

      // Block until the real POST /login response arrives — no guessing with wait(ms)
      cy.wait("@loginRequest").then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        expect(interception.response.body.user.id).to.exist;
        cy.log(`Login completed — userId: ${interception.response.body.user.id}`);
      });
    });

    it("uses cyreal interceptors to monitor login and profile load together", () => {
      cy.task("db:seed");

      // cyreal.interceptLogin() registers both /login and /checkAuth aliases at once
      cyreal.interceptLogin();

      cy.visit("/signin");
      cy.getBySel("signin-username").type("Katharina_Bernier");
      cy.getBySel("signin-password").type("s3cret");
      cy.getBySel("signin-submit").click();

      cy.wait("@loginUser").its("response.statusCode").should("eq", 200);
      cy.wait("@getUserProfile").its("response.statusCode").should("eq", 200);
    });

  });

  // ── STUB — replace real API response with fake data ────────────────────────
  describe("Stub", () => {

    it("stubs GET /transactions to return an empty list — tests the empty state UI", () => {
      cy.task("db:seed");
      cyreal.loginByApi("Katharina_Bernier");

      // Intercept BEFORE visiting — stub returns fake body, backend never receives the request
      cy.intercept("GET", "/transactions*", {
        statusCode: 200,
        body: { results: [], totalPages: 0 },
      }).as("emptyTransactions");

      cy.visit("/");
      cy.wait("@emptyTransactions");

      // UI should show the empty state — no real transactions needed in the DB
      cy.getBySel("empty-list-header").should("exist");
    });

    it("stubs POST /login to return 401 — tests the invalid credentials UI", () => {
      // Force a 401 without needing a real bad password in the DB
      cy.intercept("POST", "/login", {
        statusCode: 401,
        body: { error: "Invalid credentials" },
      }).as("failedLogin");

      cy.visit("/signin");
      cy.getBySel("signin-username").type("anyuser");
      cy.getBySel("signin-password").type("wrongpassword");
      cy.getBySel("signin-submit").click();

      cy.wait("@failedLogin");
      cy.getBySel("signin-error").should("be.visible");
    });

    it("stubs GET /transactions to return a 500 — tests the error state UI", () => {
      cy.task("db:seed");
      cyreal.loginByApi("Katharina_Bernier");

      cy.intercept("GET", "/transactions*", {
        statusCode: 500,
        body: { error: "Internal Server Error" },
      }).as("serverError");

      cy.visit("/");
      cy.wait("@serverError");

      cy.getBySel("error-message").should("exist");
    });

  });

});
