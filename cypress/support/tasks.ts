// Browser-side wrappers for all cy.task() calls registered in cypress.config.ts setupNodeEvents.
// cy.task() is the only bridge from browser spec code → Node.js process.
// Each function here maps to one registered task name on the Node side.

// Registers the "db:seed" task in cypress.config.ts via:
//
// on("task", {
//   async "db:seed"() { ... }
// })
//
// cy.task("db:seed") executes this handler in the Cypress Node.js process
// (running outside the browser). The Node.js process can access the
// filesystem, read/write database.json, launch APIs, and perform other
// server-side operations that browser code cannot.
//
// This handler POSTs to ${testDataApiEndpoint}/seed to reset the test
// database.
//
// The seed() function in cypress/support/tasks.ts is simply a browser-side
// wrapper around:
//
// cy.task("db:seed")

// Resets data/database.json from database-seed.json via POST /testData/seed
export const seed = () =>
  cy.task("db:seed");

// Returns the first record matching query from the given entity table
export const findDatabase = (entity: string, query?: object) =>
  cy.task("find:database", { entity, query });

// Returns all records matching query from the given entity table
export const filterDatabase = (entity: string, query?: object) =>
  cy.task("filter:database", { entity, query });

// Returns Auth0 { username, password } from environment variables (server-side only)
export const getAuth0Credentials = () =>
  cy.task("getAuth0Credentials");

// Returns Okta { username, password } from environment variables (server-side only)
export const getOktaCredentials = () =>
  cy.task("getOktaCredentials");

// Returns Cognito { username, password } from environment variables (server-side only)
export const getCognitoCredentials = () =>
  cy.task("getCognitoCredentials");

// Returns Google { refreshToken, clientSecret } from environment variables (server-side only)
export const getGoogleCredentials = () =>
  cy.task("getGoogleCredentials");

// Reads a file from disk via Node.js — browsers have no filesystem access.
// Path is relative to the project root.
// Usage: readFile("data/database.json").then(content => JSON.parse(content))
export const readFile = (filePath: string) =>
  cy.task("readFile", filePath);
