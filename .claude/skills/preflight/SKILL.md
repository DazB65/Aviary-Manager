---
name: preflight
version: 1.0.0
description: |
  Pre-commit verification close-out for Aviary Manager. Runs the full
  type-check + build + relevant tests, and — if the DB schema changed — confirms
  a migration SQL file AND its journal entry exist (drizzle-kit generate is
  broken in this repo, so migrations are hand-added). Use before committing or
  shipping, when asked to "verify", "preflight", "is this ready", "final
  checks", or after finishing a code change.
---

# Preflight — Aviary Manager verify close-out

Run this before claiming a change is done or before committing. Do **not** report
success until every applicable step passes. Show the evidence (command output),
not just a claim.

## 1. Type-check (always)
```bash
npx tsc --noEmit
```
Must be clean. Fix any error before continuing.

## 2. Build (always)
```bash
npx vite build
```
The chunk-size warning is expected and fine. A real build error is not.

## 3. Tests (when logic/shared code changed)
Run the tests covering what you touched, e.g.:
```bash
npx vitest run shared/access.test.ts client/src/hooks/*.test.ts
```
Note: several `server/**` tests fail at import because they need `DATABASE_URL`
— that is a pre-existing env limitation, NOT your change. Confirm the *relevant*
tests pass.

## 4. Migration check (ONLY if `drizzle/schema.ts` changed)
`drizzle-kit generate` is broken here (a 0014/0015 snapshot collision), so
migrations are written by hand. If you changed the schema, verify BOTH:
- a new `drizzle/NNNN_<name>.sql` file exists with the DDL, and
- a matching entry was appended to `drizzle/meta/_journal.json` (idx, tag,
  version, when, breakpoints), validated as parseable JSON.
```bash
ls -1 drizzle/*.sql | tail -3
python3 -c "import json;d=json.load(open('drizzle/meta/_journal.json'));print('last tags:',[e['tag'] for e in d['entries'][-3:]])"
```
The runtime migrator applies `.sql` files listed in the journal on boot (it does
NOT read snapshots), so the journal entry is what makes the migration run.
Prefer idempotent / extend-only DDL (`ADD COLUMN IF NOT EXISTS`, guarded
`UPDATE`s) since these run automatically on deploy.

## 5. Report
Summarise: type-check ✓/✗, build ✓/✗, tests run + result, migration files present
(if applicable). Only then proceed to commit/push (this repo auto-pushes to main).
