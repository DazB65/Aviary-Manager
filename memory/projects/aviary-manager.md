---
name: Aviary Manager
status: Live
url: https://aviarymanager.app
type: SaaS web app
---

# Aviary Manager

**Bird & aviary record-keeping SaaS for breeders.** Tracks individual birds, cages, breeding pairs, clutches, and pedigrees. Automates hatch-date reminders and inbreeding checks. Species-agnostic — built for any bird.

## Current Status
Live in production on Railway. Growing user base. Stripe billing active (Free / Pro).

Codex setup note as of 2026-05-04: treat this repo as production-sensitive. Protect customer data, multi-tenancy, Stripe billing, auth, photo storage, migrations, and Railway deploy behavior. Do not clean the current messy worktree unless Darren explicitly asks.

## Features Built

### Bird Management
- Add/edit/delete birds — species, ring ID, gender, DOB, cage, mutation, photo
- Grid / list view toggle (persisted)
- Photo upload to Tigris S3

### Breeding
- Breeding pairs scoped by season (same birds can re-pair in different years)
- Duplicate pair prevention per season
- Broods / clutch tracking with per-egg outcome dropdowns (fertile / infertile / cracked / hatched / died)
- Auto-calculated fertility check date (lay + 7 days)
- Auto-calculated expected hatch date (lay + species incubation period)

### Pedigree & Genetics
- 5-generation scrollable pedigree tree
- Wright's coefficient inbreeding calculation — live warning on pair creation
- Siblings detection (full and half)
- Descendants list per bird

### Events & Reminders
- Task-like events linked to birds or pairs
- Type/date based, completion toggle

### SaaS / Billing
- Free tier: 20 birds, 5 breeding pairs
- Pro tier: unlimited, all features
- Stripe monthly + annual, checkout, billing portal, webhook handler
- Plan enforcement in tRPC procedures

### Export
- PDF pedigree export (PDFKit, server-side)

### AI Chat
- Streaming chat with OpenAI SDK
- Experimental tool calling (chat can invoke backend functions)

### Other
- Dark / light theme
- Admin: user list with plan / bird count
- Statistics page
- 36 pre-seeded species + user custom species

## What's Next / In Progress
- Full email verification (re-enable once RESEND_API_KEY set)
- Remove legacy Manus OAuth once all users migrated to email/password
- Expand admin dashboard
- Advanced statistics / analytics (skeleton exists)
- Mobile app consideration (currently responsive web only)
- CI/CD — `.github/workflows/` exists but empty

## Codex Safety Notes
- Every protected query/mutation must preserve `user.id` isolation.
- Do not read, print, edit, or commit `.env`.
- Do not push to `main` without explicit approval because the app is live on Railway.
- Do not run migrations against non-local data without approval.
- Do not change Stripe pricing, limits, webhooks, auth, or storage behavior without approval.

## Database Schema (Key Tables)
- `users` — accounts, auth, subscription info
- `species` — 36 pre-seeded + user custom (incubationDays, fledglingDays, sexingMethod)
- `birds` — individual birds (ringId, gender, DOB, cageNumber, colorMutation, photoUrl, fatherId, motherId)
- `breedingPairs` — pairs scoped by season
- `broods` — clutch per pair (eggsLaid, layDate, expectedHatchDate, actualHatchDate, status)
- `clutchEggs` — individual egg outcomes
- `events` — reminders linked to birds or pairs
- `userSettings` — per-user prefs (favouriteSpeciesIds, breedingYear)
