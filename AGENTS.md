# Aviary Manager

## Purpose

Aviary Manager is Darren's live SaaS for bird keepers and breeders at `https://aviarymanager.app`. It tracks birds, cages, breeding pairs, clutches, pedigrees, health/events, photos, billing, and related aviary management data. It is species-agnostic and intended to replace notebooks and spreadsheets.

## Operating Mode

- Status: live production SaaS with real users.
- Primary priority: production safety, customer data protection, and steady product improvement.
- Treat `main` as deploy-sensitive because Railway hosts the live app.
- Prefer small, reviewable changes with clear validation.
- Do not perform cleanup of the messy worktree unless Darren explicitly asks.

User context:

- Darren is in Brisbane and prefers concise, technical, practical help.
- The old `CLAUDE.md` is reference only; keep this `AGENTS.md` current for Codex.

## Stack

- Frontend: React 19, Vite 7, TypeScript, Wouter, TanStack Query, tRPC client.
- Styling/UI: Tailwind CSS 4.1, Radix UI, lucide-react, shadcn-style local components.
- Backend: Express 4, tRPC 11, TypeScript.
- Database: PostgreSQL with Drizzle ORM.
- Auth: JWT in httpOnly cookies, bcryptjs.
- Storage: Tigris S3 for bird photos.
- Billing: Stripe Free/Pro tiers.
- Email: Resend/Nodemailer.
- AI: OpenAI SDK / AI SDK streaming chat and tool calling.
- Deploy: Docker on Railway, Node 20-alpine.
- Package manager: `pnpm`.

## Key Paths

- `client/src/App.tsx`: frontend routing.
- `client/src/`: React app.
- `client/src/pages/`: top-level pages.
- `client/src/components/`: reusable UI and feature components.
- `client/src/hooks/`: frontend data/form hooks.
- `server/_core/index.ts`: Express entry point.
- `server/routers.ts`: tRPC router composition.
- `server/services/`: domain services.
- `server/stripeRoutes.ts`, `server/stripeProducts.ts`: Stripe integration.
- `shared/`: shared types/contracts.
- `drizzle/schema.ts`: database schema.
- `drizzle/`: migrations and snapshots.
- `Dockerfile`: Railway container build.
- `.env.example`: example environment values.
- `.env`: local secrets; do not read, print, edit, or commit unless Darren explicitly asks.
- `Aviary Manager.md`: project journal and feature history.
- `TASKS.md`: current task list.
- `Marketing/`: campaign/content assets.
- `memory/projects/aviary-manager.md`: existing project memory.
- `docs/codex-memory.md`: durable Codex memory.

## Commands

Use `pnpm`.

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Typecheck: `pnpm check`
- Tests: `pnpm test`
- Build: `pnpm build`
- DB migration generation: `pnpm db:generate`
- DB migrate/push: `pnpm db:push`

## Codex Runbook

Start every task by inspecting:

- This `AGENTS.md`.
- `docs/codex-memory.md`.
- `TASKS.md`.
- `Aviary Manager.md`.
- `memory/projects/aviary-manager.md`.
- `package.json`.
- Current git status.
- Relevant client/server/shared/drizzle files.

For product work:

1. Preserve the existing React, tRPC, Drizzle, and Tailwind patterns.
2. Keep screens practical for breeders; avoid marketing-placeholder UI inside the app.
3. Validate with the narrowest useful check, then broaden for release-risk changes.
4. Call out production, data, billing, and deploy risk in the final summary.

For bugs:

1. Identify root cause before editing.
2. Check whether the bug affects multi-tenancy, billing, auth, photos, or migrations.
3. Add or update focused tests when practical.
4. Avoid speculative rewrites.

For database work:

1. Inspect `drizzle/schema.ts`, existing migrations, and service call sites first.
2. Migration generation is allowed for local planning.
3. Do not run migrations against non-local data without explicit approval.
4. Treat data loss, nullable changes, uniqueness changes, and backfills as high-risk.

For production/deploy work:

1. Railway deploy risk must be explicit.
2. Do not push to `main` without Darren approving the deploy risk.
3. Do not change environment variables, Docker deploy behavior, or production startup behavior without approval.

## Validation Ladder

Use the smallest useful validation for the task:

1. Static inspection for docs/marketing-only changes.
2. `pnpm check` for TypeScript changes.
3. `pnpm test` for service, hook, auth, breeding, genetics, or billing-adjacent changes.
4. `pnpm build` for release-risk, routing, deploy, or shared-contract changes.

If validation cannot be run, say why and describe the residual risk.

## Production Safety Rules

- Protect multi-tenancy: every protected query/mutation must remain filtered by `user.id`.
- Treat auth, JWT cookies, Stripe, Tigris storage, email verification, AI tools, and migrations as high-risk.
- Never log secrets, JWTs, Stripe payload secrets, customer data, bird photos, or user prompts.
- Never read or print `.env` values unless Darren explicitly asks.
- Never commit `.env`, credentials, customer exports, local database dumps, or derived media dumps.
- Keep Free tier limits in mind: 20 birds and 5 breeding pairs.
- Keep Pro as unlimited birds and pairs unless Darren explicitly changes pricing.
- Do not delete user/customer data or alter retention behavior without explicit approval.

## AI Feature Safety

- AI chat/tool calling must respect user isolation.
- Tool calls must only access data for the authenticated user.
- Do not expose internal IDs or cross-user data in AI responses.
- Avoid unbounded AI actions that mutate data without clear user intent.
- Treat prompt injection and user-controlled content as untrusted.

## Git And GitHub

- Repo: `DazB65/Aviary-Manager`.
- Remote: `git@github.com:DazB65/Aviary-Manager.git`.
- Current/default branch observed during setup: `main`.
- Current worktree may be messy; inspect `git status` before editing.
- Do not clean, restore, remove, or reorganize unrelated untracked/deleted files without Darren asking.
- For feature work, create/use `codex/<short-task>` or another clearly named feature branch.
- Before committing, show the intended scope if unrelated work is present.
- PRs should include summary, checks run, DB/migration impact, Stripe/auth/storage impact, and Railway/deploy risk.
- Do not push to `main` without explicit approval.

## Marketing And Support

- Use `Marketing/` for campaign/content assets.
- Use `TASKS.md` for current operational priorities.
- Keep support-facing copy practical and breeder-focused.
- Do not publish YouTube, Facebook, external posts, or customer communications without approval.

## Ask Before

- Pushing, deploying, tagging, or creating a release.
- Changing Stripe pricing, billing flows, subscription limits, webhooks, or checkout/billing portal behavior.
- Changing auth, cookies, password flows, email verification, or legacy Manus OAuth migration.
- Running database migrations against non-local data.
- Changing environment variables, Railway settings, Docker startup, or production endpoints.
- Deleting user/customer data, photos, or changing data-retention behavior.
- Broad schema rewrites, architecture rewrites, or large UI redesigns.
- Adding major dependencies.
- Publishing content to YouTube, Facebook, or external channels.

## Memory Hygiene

- Update `docs/codex-memory.md` after important product, architecture, production, billing, auth, migration, or release decisions.
- Keep `memory/projects/aviary-manager.md` aligned with current status.
- Add "Codex gotcha" notes when an agent makes a repeatable mistake.
- Keep memory concise and factual; avoid chat transcripts.
