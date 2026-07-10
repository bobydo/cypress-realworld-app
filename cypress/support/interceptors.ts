// Reusable intercept setup functions.
// Call before the action that triggers the request, then cy.wait("@aliasName") to block until complete.

export const interceptLogin = () => {
  cy.intercept("POST", "/login").as("loginUser");
  cy.intercept("GET", "/checkAuth").as("getUserProfile");
};

export const interceptTransactions = () => {
  cy.intercept("GET", "/transactions*").as("getTransactions");
  cy.intercept("POST", "/transactions").as("createTransaction");
  cy.intercept("PATCH", "/transactions/*").as("updateTransaction");
};

export const interceptBankAccounts = () => {
  cy.intercept("GET", "/bankAccounts*").as("getBankAccounts");
  cy.intercept("POST", "/bankAccounts").as("createBankAccount");
  cy.intercept("DELETE", "/bankAccounts/*").as("deleteBankAccount");
};

export const interceptNotifications = () => {
  cy.intercept("GET", "/notifications*").as("getNotifications");
  cy.intercept("PATCH", "/notifications/*").as("updateNotification");
};
