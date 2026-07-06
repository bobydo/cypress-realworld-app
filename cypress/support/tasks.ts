// Browser-side wrappers for all cy.task() calls registered in cypress.config.ts setupNodeEvents.
// cy.task() is the only bridge from browser spec code → Node.js process.
// Each function here maps to one registered task name on the Node side.

export const cyreal = {
  // Resets data/database.json from database-seed.json via POST /testData/seed
  seed: () =>
    cy.task("db:seed"),

  // Returns the first record matching query from the given entity table
  findDatabase: (entity: string, query?: object) =>
    cy.task("find:database", { entity, query }),

  // Returns all records matching query from the given entity table
  filterDatabase: (entity: string, query?: object) =>
    cy.task("filter:database", { entity, query }),

  // Returns Auth0 { username, password } from environment variables (server-side only)
  getAuth0Credentials: () =>
    cy.task("getAuth0Credentials"),

  // Returns Okta { username, password } from environment variables (server-side only)
  getOktaCredentials: () =>
    cy.task("getOktaCredentials"),

  // Returns Cognito { username, password } from environment variables (server-side only)
  getCognitoCredentials: () =>
    cy.task("getCognitoCredentials"),

  // Returns Google { refreshToken, clientSecret } from environment variables (server-side only)
  getGoogleCredentials: () =>
    cy.task("getGoogleCredentials"),

  // Reads a file from disk via Node.js — browsers have no filesystem access.
  // Path is relative to the project root.
  // Usage: cyreal.readFile("data/database.json").then(content => JSON.parse(content))
  readFile: (filePath: string) =>
    cy.task("readFile", filePath),
};
