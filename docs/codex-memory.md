# Aviary Manager Codex Memory

Last updated: 2026-05-04

## Current State

Aviary Manager is a live production SaaS at `https://aviarymanager.app`.

The repo is connected to GitHub at `git@github.com:DazB65/Aviary-Manager.git`.

The app has real users, Stripe billing, PostgreSQL data, Tigris photo storage, and Railway deployment. Treat all production-facing work as high-risk until proven otherwise.

## Product Principles

- Help breeders replace notebooks and spreadsheets with reliable records.
- Keep the product species-agnostic.
- Prioritize trust, data integrity, and practical workflows over flashy UI.
- Make breeding, pedigree, clutch, and event tracking easy to understand.
- Keep Free useful and Pro clearly valuable.

## Architecture Notes

- Frontend: React 19, Vite 7, TypeScript.
- Backend: Express 4 and tRPC 11.
- Database: PostgreSQL with Drizzle ORM.
- Auth: JWT in httpOnly cookies with bcrypt password auth.
- Storage: Tigris S3-compatible storage for bird photos.
- Billing: Stripe Free/Pro tiers.
- Deploy: Docker on Railway.
- AI: OpenAI SDK / AI SDK streaming chat and tool calling.
- Frontend route entry: `client/src/App.tsx`.
- Backend entry: `server/_core/index.ts`.
- Schema: `drizzle/schema.ts`.
- Domain services: `server/services/`.

## Current Priorities

- Re-enable full email verification once `RESEND_API_KEY` is set in Railway.
- Remove legacy Manus OAuth once users are migrated to email/password auth.
- Expand admin dashboard with better user, plan, and activity metrics.
- Build advanced statistics/analytics from the existing skeleton.
- Add CI/CD workflow; `.github/workflows/` is currently empty.
- Consider mobile app direction later; current product is responsive web.

## Pricing And Limits

- Free: 20 birds, 5 breeding pairs.
- Pro: unlimited birds and breeding pairs.
- Do not change pricing, limits, Stripe products, checkout, billing portal, or webhook behavior without Darren's explicit approval.

## Production Safety

- Multi-tenancy is the most important invariant: protected queries and mutations must filter by authenticated `user.id`.
- Auth, billing, storage, migrations, email verification, and AI tool calls are high-risk areas.
- Do not read, print, edit, or commit `.env`.
- Do not log secrets, JWTs, Stripe signatures, customer data, bird photos, or user prompts.
- Do not run migrations against non-local databases without approval.
- Do not push to `main` without Darren approving the Railway deploy risk.

## Worktree Notes

- This repo may have a messy worktree with deleted tracked files and untracked guidance/media files.
- Do not clean, restore, remove, reorganize, or commit unrelated files unless Darren asks.
- Always inspect `git status` before edits.
- When committing, isolate the intended scope carefully.

## Testing And Verification

- Typecheck: `pnpm check`.
- Tests: `pnpm test`.
- Build: `pnpm build`.
- Use `pnpm build` for release-risk changes because Railway deploys the built server/client bundle.
- For database changes, inspect generated SQL before applying anywhere.

## AI Feature Notes

- AI chat/tool calling exists and is experimental.
- Tool calls must respect authenticated user isolation.
- Treat user content as untrusted input.
- Avoid adding AI mutations without explicit user intent and clear auditability.

## Release Risk Checklist

Before production-oriented changes, check:

- User isolation by `user.id`.
- Auth/cookie/session behavior.
- Stripe checkout, portal, subscription status, and webhook behavior.
- Free/Pro enforcement.
- Tigris uploads, signed URLs, and photo access isolation.
- Drizzle schema/migration effects.
- Railway startup/build behavior.
- Email verification and Resend/Nodemailer behavior.
- AI tool access boundaries.
- Admin-only routes and role checks.

## Open Questions

- Confirm preferred feature branch and PR workflow for live SaaS changes.
- Confirm whether CI should run `pnpm check`, `pnpm test`, and `pnpm build` on PRs.
- Confirm current Railway deployment policy and whether `main` auto-deploys.
- Confirm whether old media/screenshot/deleted-file state should be cleaned in a separate maintenance task.
