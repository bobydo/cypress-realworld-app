// Demonstrates cy.task() — the only bridge from browser spec code → Node.js.
// Browsers cannot access the filesystem, environment variables, or backend services directly.
// cy.task() sends a message to the Node process, which runs the operation and returns the result.
//
// Three task types shown here:
//   1. db:seed        — reset database to known state via backend HTTP call
//   2. find:database  — query the seeded database
//   3. readFile       — read a file from disk (impossible in the browser)

import { seed, findDatabase, filterDatabase, readFile } from "../../support/tasks";

// axios.post("/testData/seed")   → ← TRIGGER — real HTTP request leaves Node
// backend receives POST /seed
describe("Custom Tasks — cy.task() demo", () => {

  it("db:seed resets the database to a known state", () => {
    // The browser calls cy.task("db:seed")
    // Node process calls axios.post("http://localhost:3001/testData/seed")
    // Backend copies database-seed.json → database.json
    // Browser receives HTTP 200 and continues
    seed().then((result) => {
      expect(result).to.exist;
    });
  });

  it("find:database queries the seeded database from the browser", () => {
    seed();

    // Browser cannot read database.json directly — cy.task bridges to Node
    // Node calls axios.get("/testData/users") → lodash _.find → returns first match
    findDatabase("users").then((user: any) => {
      expect(user).to.have.property("id");
      expect(user).to.have.property("username");
    });
  });

  it("filter:database returns all records matching a query", () => {
    seed();

    // Returns all users — same Node bridge, lodash _.filter instead of _.find
    filterDatabase("users").then((users: any[]) => {
      expect(users).to.be.an("array");
      expect(users.length).to.be.greaterThan(0);
    });
  });

  it("readFile reads a file from disk — the browser cannot do this directly", () => {
    // Browser calls cy.task("readFile", "data/database-seed.json")
    // Node process calls fs.readFileSync(path) and returns the raw string
    // Browser receives the content and can parse it
    readFile("data/database-seed.json").then((content: string) => {
      const db = JSON.parse(content);
      expect(db).to.have.property("users");
      expect(db.users).to.be.an("array");
    });
  });

});
