# Aviary Manager

**Status:** Live in production
**URL:** https://aviarymanager.app
**Codebase:** iCloud → `2-Dev/Projects/Aviary-Manager`
**Hosting:** Railway (Docker, Node 20-alpine)

---

## What It Is

Web app for bird keepers and breeders to manage their whole aviary in one place. Tracks individual birds, cages, breeding pairs, clutches, and pedigrees. Automates hatch-date reminders and basic inbreeding checks. Designed to be species-agnostic — built for any bird, though the original use case is a real breeder managing their own aviary. Goal: replace notebooks and spreadsheets.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, TypeScript |
| Styling | Tailwind CSS 4.1, Radix UI |
| Forms | React Hook Form + Zod |
| Routing | Wouter |
| State/Data | TanStack React Query + tRPC |
| Backend | Express 4, tRPC 11 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (httpOnly cookie), bcryptjs |
| Storage | Tigris S3-compatible (bird photos) |
| Billing | Stripe (Free/Pro tiers) |
| Email | Nodemailer |
| PDF | PDFKit (pedigree export) |
| AI | OpenAI SDK (streaming chat, tool calling) |
| Testing | Vitest |
| Deploy | Docker + Railway |

---

## Architecture

Single monorepo — `client/`, `server/`, `shared/`, `drizzle/`.

- **Frontend:** 15 pages (Dashboard, Birds, Breeding Pairs, Broods, Events, Settings, Admin, Stats, Landing, Help, Auth)
- **Backend:** Express + tRPC router. Procedures split into `protectedProcedure` (auth required) and `publicProcedure`
- **Database:** PostgreSQL via Drizzle ORM. Auto-migrates on startup
- **Auth:** Email/password with bcrypt. JWT stored in httpOnly cookie. Legacy Manus OAuth kept for backward compat (deprecated)
- **Multi-tenancy:** Full user isolation — all procedures filter by `user.id`

---

## Database Schema (Key Tables)

- `users` — accounts, auth, subscription info (plan, stripeCustomerId)
- `species` — 36 pre-seeded species + user custom species (incubationDays, fledglingDays, sexingMethod, etc.)
- `birds` — individual birds (ringId, gender, DOB, cageNumber, colorMutation, photoUrl, fatherId, motherId)
- `breedingPairs` — pairs scoped by season (same birds can re-pair in different years)
- `broods` — clutch per pair (eggsLaid, layDate, expectedHatchDate, actualHatchDate, status)
- `clutchEggs` — individual egg outcomes (fertile / infertile / cracked / hatched / died)
- `events` — reminders linked to birds or pairs
- `userSettings` — per-user prefs (favouriteSpeciesIds, breedingYear)

---

## Features Built

**Bird management**
- Add/edit/delete birds with full profile (species, ring ID, gender, DOB, cage, mutation, photo)
- Grid/list view toggle (persisted to localStorage)
- Photo upload to Tigris S3

**Breeding**
- Breeding pairs scoped by season — same birds can be re-paired in different years
- Duplicate pair prevention per season
- Broods / clutch tracking with per-egg outcome dropdowns
- Auto-calculated fertility check date (lay date + 7 days)
- Auto-calculated expected hatch date (lay date + species incubation period)

**Pedigree & genetics**
- 5-generation scrollable pedigree tree
- Wright's coefficient inbreeding calculation — live warning on pair creation, colour-coded badge on pair cards
- Siblings detection (full and half)
- Descendants list per bird

**Events & reminders**
- Task-like events linked to birds or pairs
- Type/date based, completion toggle

**SaaS / billing**
- Free tier: 20 birds, 5 breeding pairs
- Pro tier: unlimited, all features
- Stripe monthly + annual pricing, checkout, billing portal, webhook handler
- Plan enforcement in tRPC procedures

**Export**
- PDF pedigree export (PDFKit, server-side)

**AI chat**
- Streaming chat with OpenAI SDK
- Experimental tool calling (chat can invoke backend functions)

**Other**
- Dark/light theme
- Admin: user list with plan/bird count
- Statistics page
- 15 Vitest tests covering auth, birds, pairs, broods, clutch eggs

---

## Environment Variables

```
DATABASE_URL
JWT_SECRET
TIGRIS_ENDPOINT_URL
TIGRIS_ACCESS_KEY_ID
TIGRIS_SECRET_ACCESS_KEY
TIGRIS_BUCKET_NAME
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NODE_ENV
PORT
```

---

## What's In Progress / Next

- [ ] Full email verification (re-enable once RESEND_API_KEY set)
- [ ] Remove legacy Manus OAuth once all users migrated to email/password
- [ ] Expand admin dashboard
- [ ] Advanced statistics / analytics (skeleton exists)
- [ ] Mobile app consideration (currently responsive web only)
- [ ] CI/CD — `.github/workflows/` exists but empty

---

## Key Files

| File | Purpose |
|---|---|
| `drizzle/schema.ts` | Full DB schema |
| `server/_core/index.ts` | Express app entry point |
| `client/src/App.tsx` | Frontend routing |
| `Dockerfile` | Container build |
| `todo.md` | Full feature history / project journal |
