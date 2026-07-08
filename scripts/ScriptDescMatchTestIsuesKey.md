# Design: Match `it()` Titles to Existing Xray Test Keys

Reference doc for a not-yet-implemented fix to `scripts/Upload-XrayResult.ps1`.
Nothing in this repo has been changed to implement this yet — see "Status" at the
bottom.

## Problem

`Upload-XrayResult.ps1` uploads Cypress/Mochawesome results to Xray Cloud's
`import/execution` API. Its `ConvertSuite` function (lines 101-122) builds each test
entry with only a `summary` (the Mocha `fullTitle`) and never a `key` — so every test,
on every run, looks "new" to Xray. Xray's fallback behavior for keyless entries is to
auto-create a brand-new Jira `Test` issue.

This is the confirmed root cause of the duplicate `SCRUM-xx` Test issues found in
`Jira_XrayKey.csv`: two near-identical batches of ~111 tests were created ~20 minutes
apart. That's direct proof Xray does **not** dedupe by matching summary text — the
second run recreated everything from scratch instead of reusing the first batch's
issues.

Separately, some `it()` titles in specs (e.g. `cypress/tests/ui/bankaccounts.spec.ts`)
are already hand-tagged with real Xray keys at the end of the title, e.g.
`"creates a new bank account @SCRUM-184"`. This tagging convention matches how
official Xray automation plugins identify existing tests — but today it's inert:
`ConvertSuite` never reads the tag back out, so tagged tests still get sent keyless
and Xray still auto-creates duplicates for them.

## Goal

Make `ConvertSuite` recognize the `@KEY` tag in a test's title and route that test to
update its existing Xray Test issue instead of spawning a new one, while still
auto-creating for genuinely untagged (new) tests.

## Design

### Extraction rule

From each test's `$t.fullTitle`, regex-match a trailing Jira key tag:

```
@([A-Z][A-Z0-9]+-\d+)\s*$
```

- **Match found** → strip the tag from the title to get a clean `summary`; put the
  matched key into `testKey` on the Xray payload entry; **omit** `testInfo` entirely
  for that entry (per Xray Cloud's Import Execution Results "Xray JSON" format, a
  `testKey` reference updates the existing Test's run instead of creating one).
  > ⚠️ Verify the exact field name `testKey` against current Xray Cloud REST API docs
  > before implementing — this is the one part of the fix that depends on an external
  > API contract, not just this repo's code.
- **No match** → unchanged current behavior: send `testInfo` (`projectKey`, `summary`,
  `type: "Generic"`) with no key, letting Xray auto-create a new Test issue exactly as
  it does now.

### Flow chart

```
Mochawesome test entry ($t.fullTitle)
            │
            ▼
Regex: trailing "@([A-Z]+-\d+)"?
            │
      ┌─────┴─────┐
    Match        No match
      │             │
      ▼             ▼
Strip tag →    Keep full title
clean summary   as summary
      │             │
      ▼             ▼
testKey = "SCRUM-184"   testInfo = {
(testInfo omitted)        projectKey: "SCRUM",
      │                    summary,
      │                    type: "Generic"
      │                  }
      └─────────┬────────┘
                ▼
   Xray test-run entry: { testKey? , testInfo?, status, comment }
                ▼
          Xray Import API
                │
      ┌─────────┴─────────┐
  testKey present     testInfo only (no key)
      │                     │
      ▼                     ▼
Update existing        Auto-create NEW
Test's Test Run        Test issue
(no duplicate)         (only for genuinely
                        untagged/new tests)
```

### Residual manual step (not automated by this fix)

When Xray auto-creates a Test issue for a previously-untagged test, someone still
needs to copy the returned key back into that test's `it()` title (as already done
for the 4 bankaccounts.spec.ts tests). Auto-writing the key back into spec files is
out of scope for this fix — a possible future enhancement, not something to build now.

## Files to change (when implemented)

- **`scripts/Upload-XrayResult.ps1`** — modify `ConvertSuite` (lines 101-122): add the
  regex extraction, branch the payload object between `testKey`-based and
  `testInfo`-based entries as shown above.

## Verification (when implemented)

1. Take a Mochawesome JSON report containing at least one tagged test (e.g. title
   ending `@SCRUM-184`) and one untagged test.
2. Run the updated script against it with payload inspection (temporarily log
   `$payloadJson` before sending, or inspect the temp file) and confirm:
   - Tagged test's entry has `testKey: "SCRUM-184"` and no `testInfo` key.
   - Untagged test's entry still has `testInfo` with no `testKey`.
3. Run it for real against a test Xray project (or SCRUM if acceptable) and confirm via
   the Xray UI: the tagged test's existing issue (SCRUM-184) gets a new Test Run under
   the new Test Execution — no new Test issue is created for it. The untagged test
   still creates exactly one new Test issue, not a duplicate on repeat runs (until it
   too gets tagged).
4. Re-run the same report a second time and confirm the tagged test does not spawn a
   second duplicate Test issue (this directly proves the original bug is fixed).

## Status

📋 **Design only — not implemented.** `scripts/Upload-XrayResult.ps1` is unchanged.
This doc is the saved reference for whoever picks up the implementation.
