# Aviary Manager Codex Memory

Last updated: 2026-05-10

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
- Billing: Stripe 7-day trial, then Starter or Pro subscriptions.
- Deploy: Docker on Railway.
- AI: OpenAI SDK / AI SDK streaming chat and tool calling.
- AI copilot v1: server-backed conversations, explicit user-approved memory, daily brief, natural-language search, breeding planner recommendations, page-aware prompt buttons, and metadata-only usage logging.
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

- There is no public Free tier.
- New accounts get a 7-day trial, then must subscribe to Starter or Pro.
- Starter: paid subscription for core aviary management.
- Pro: paid subscription with AI Assistant access.
- The database may still use internal `free` plan values for legacy trial/expired states until a careful enum migration is planned.
- Do not change pricing, limits, Stripe products, checkout, billing portal, webhook behavior, or plan enums without Darren's explicit approval.

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
- Trial/Starter/Pro enforcement.
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

## Recent Decisions

- 2026-05-06: Public Free tier removed from copy and admin controls. Canonical product model is 7-day trial, then Starter or Pro subscription.
- 2026-05-06: New bird photos should upload to Tigris and store stable same-origin `/api/photos/birds/{userId}/{object}` URLs. Existing base64 `photoUrl` values may still exist until a separate migration/cleanup is planned.
- 2026-05-06: The main Events & Reminders page is an open-actions list only. Completed events/reminders should remain available in relevant bird/pair history, not via a global Completed tab.
- 2026-05-06: Production startup should fail fast on migration errors; non-production may log and continue for local debugging.
- 2026-05-07: Stripe should own live subscription Products/Prices. Checkout uses configured `STRIPE_PRICE_*` Price IDs from Railway instead of dynamic inline price data.
- 2026-05-08: Stripe subscription webhooks should derive Starter/Pro access from configured Price IDs first. Legacy subscriptions may fall back to valid `plan_tier` metadata, but unknown/missing plan data must fail closed instead of defaulting to Pro.
- 2026-05-08: Bird photo uploads validate decoded image bytes against the declared MIME type before writing to Tigris. Removing a saved bird photo sends `photoUrl: null` so Drizzle clears the field instead of ignoring `undefined`.
- 2026-05-08: Tigris storage config accepts `TIGRIS_*`, `AWS_*`, and Railway Bucket aliases. Removing or replacing a managed `/api/photos/birds/{userId}/...` photo clears the DB field and best-effort deletes the old Tigris object.
- 2026-05-10: AI writes remain approval-gated. AI conversations and explicit memories are now persisted in user-scoped tables; AI logs must remain metadata-only with no prompts, notes, photos, JWTs, secrets, or customer content.
- 2026-05-11: Security hardening tightened the session cookie to `SameSite=Lax`, removed Stripe checkout request-body logging, and cleaned known dependency advisories with package updates/overrides. Keep CSP hardening as a separate careful pass because `helmet` currently has `contentSecurityPolicy: false`.
