# Cypress Database Flow: Seed → Query

How a spec file gets test data, from database seed to `cy.database()` result.
Three contexts are involved: the **browser** (spec code), Cypress's **Node process**
(`setupNodeEvents`), and the real **backend** (Express + lowdb).

## 1. Seed — reset the database before a test

```
spec file (browser)
  cy.task("db:seed")
        │  cy.task = browser → Node IPC
        ▼
cypress.config.ts setupNodeEvents → on("task", { "db:seed" ... })   (cypress.config.ts:89)
        │  axios.post("http://localhost:3001/testData/seed")
        │  ── plain HTTP request over the network, no special Cypress wiring ──
        │     (backend must already be running separately, e.g. `yarn start`)
        ▼
backend/app.ts → app.use("/testData", testDataRoutes)                (app.ts:73)
        │  Express strips the "/testData" prefix and routes "/seed"
        │  into the testDataRoutes router. Only mounted when
        │  NODE_ENV is "test" or "development" (app.ts:72).
        ▼
backend/testdata-routes.ts → router.post("/seed", ...)               (testdata-routes.ts:13)
        │  calls seedDatabase()
        ▼
backend/database.ts → seedDatabase()                                 (database.ts:94)
        reads  data/database-seed.json
        writes data/database.json   (lowdb file, via db.setState(seed).write())
        │
        ▼
res.sendStatus(200) → HTTP response → axios.post(...) resolves → cy.task("db:seed") resolves in the spec
```

> **Note — where `db` comes from** ([database.ts:89-92](backend/database.ts#L89-L92)):
> ```js
> const databaseFile = path.join(__dirname, "../data/database.json");
> const adapter = new FileSync<DbSchema>(databaseFile);
>
> const db = low(adapter);
> const saveUser = (user: User) => {
>   db.get(USER_TABLE).push(user).write();
> };
> ```
> This runs once at module load (when the backend process starts), before any request
> arrives. `FileSync` is lowdb's synchronous file adapter pointed at `data/database.json`;
> `low(adapter)` wraps it as the `db` instance every function in this file reads/writes
> through (`db.get(USER_TABLE)...`, `db.setState(seed).write()` in `seedDatabase()`, etc.).
> It's the single in-memory + on-disk store for the whole backend process.

## 2. Query — pull a fixture during a test

```
spec file (browser)
  cy.database("find", "users")                                       (e.g. transaction-view.spec.ts:23)
        ▼
cy.database custom command                                           (cypress/support/commands.ts:341)
  packages { entity, query } and calls
  cy.task(`${operation}:database`, params)   → task name = "find:database"
        ▼
cypress.config.ts setupNodeEvents → on("task", { "find:database" ... })  (cypress.config.ts:96-101)
  routes to queryDatabase({ entity, query }, callback)                (cypress.config.ts:79-86)
        │  axios.get(`http://localhost:3001/testData/${entity}`)
        ▼
backend/app.ts → app.use("/testData", testDataRoutes)                (app.ts:73)
        │  same mount as the seed route, Express routes "/:entity" in
        ▼
backend/testdata-routes.ts → router.get("/:entity", ...)              (testdata-routes.ts:19)
  getAllForEntity(entity) reads the (already-seeded) lowdb file
        │
        ▼
res.json({ results }) → HTTP response → axios.get(...) resolves in queryDatabase
        ▼
back in Node process: lodash _.find / _.filter applies `query` to the returned rows
        ▼
result resolves back through cy.task → cy.database → spec's .then((user) => ...)
```

## Key points

- `cy.task` is the **only** bridge between browser-sandboxed spec code and Node — it can't
  touch the filesystem or call arbitrary services directly.
- Seeding and querying both go through the **same real backend** (`localhost:3001`); nothing
  is mocked. The seed file `data/database-seed.json` is the single source of truth for
  starting state.
- `"find:database"` / `"filter:database"` are two task names sharing one `queryDatabase`
  helper, differing only by which lodash callback (`_.find` vs `_.filter`) is passed in.
- Task names are matched by **string convention**: `cy.database(operation, ...)` builds
  `` `${operation}:database` ``, which must exactly match a key registered in
  `on("task", { ... })`.
- The backend is a **separate, already-running** Express server (started independently,
  e.g. `yarn start`/`yarn dev`) — `setupNodeEvents` doesn't launch or import it, it just
  makes a normal HTTP request the same way a browser would.
- `/testData/*` routes only exist when `NODE_ENV` is `"test"` or `"development"`
  (`backend/app.ts:72`) — they're absent in production builds.
