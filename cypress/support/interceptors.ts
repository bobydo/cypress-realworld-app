// Reusable intercept setup functions.
// Call before the action that triggers the request, then cy.wait("@aliasName") to block until complete.

export const cyreal = {
  interceptLogin: () => {
    cy.intercept("POST", "/login").as("loginUser");
    cy.intercept("GET", "/checkAuth").as("getUserProfile");
  },

  interceptTransactions: () => {
    cy.intercept("GET", "/transactions*").as("getTransactions");
    cy.intercept("POST", "/transactions").as("createTransaction");
    cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
  },

  interceptBankAccounts: () => {
    cy.intercept("GET", "/bankAccounts*").as("getBankAccounts");
    cy.intercept("POST", "/bankAccounts").as("createBankAccount");
    cy.intercept("DELETE", "/bankAccounts/*").as("deleteBankAccount");
  },

  interceptNotifications: () => {
    cy.intercept("GET", "/notifications*").as("getNotifications");
    cy.intercept("PATCH", "/notifications/*").as("updateNotification");
  },
};
