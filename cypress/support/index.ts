import { cyreal as commands }     from "./commands";
import { cyreal as helpers }      from "./utils";
import { cyreal as assertions }   from "./assertions";
import { cyreal as interceptors } from "./interceptors";
import { cyreal as tasks }        from "./tasks";

// Single import point for all cyreal utilities.
// Usage in any spec:
//   import { cyreal } from "../support";
//   cyreal.seed()                          → db:seed task
//   cyreal.filterDatabase("users")         → filter:database task
//   cyreal.generateUser()                  → faker test data
//   cyreal.interceptBankAccounts()         → intercept setup
//   cyreal.isSenderOrReceiver(userId)      → custom assertion
//   cyreal.loginByApi("alice")             → custom command
export const cyreal = {
  ...commands,
  ...helpers,
  ...assertions,
  ...interceptors,
  ...tasks,
};
