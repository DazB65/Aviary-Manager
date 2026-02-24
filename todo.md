# Aviary Manager TODO

## Schema & Backend
- [x] Species table with incubation periods pre-populated
- [x] Birds table (species, ring ID, gender, DOB, color/mutation, photo URL, parent IDs)
- [x] Breeding pairs table (bird1, bird2, pairing date, status)
- [x] Broods table (pair, season, eggs laid, lay date, fertility check date, hatch date, status)
- [x] Events/reminders table (title, notes, date, bird ID or pair ID, type)
- [x] tRPC routers: species, birds, pairs, broods, events
- [x] Photo upload endpoint (S3 storage)
- [x] Species seed data (36 species: canaries, finches, parakeets, cockatiels, lovebirds, doves, parrots, etc.)
- [x] toggleEventComplete procedure in events router
- [x] getDashboardStats query helper

## Frontend Pages
- [x] Global theme: bright amber/teal/rose/violet palette, Plus Jakarta Sans font, CSS variables
- [x] DashboardLayout with sidebar navigation (aviary-branded)
- [x] Dashboard page: stats cards (total birds, active pairs, eggs incubating, upcoming events), upcoming hatches, recent birds
- [x] Birds page: grid view with search/filter, add/edit/delete modal, photo upload
- [x] Bird detail page: full profile with pedigree tree (3 generations)
- [x] Breeding pairs page: list, add pair, update status (active/retired)
- [x] Broods page: egg log per pair, auto-calculated fertility check + hatch dates
- [x] Events/reminders page: grouped by date, add/edit/delete, completion toggle
- [x] Auth: login page, logout button in sidebar

## Quality
- [x] Vitest tests for all server procedures (10 tests passing)
- [x] Loading states and empty states on all pages
- [x] Responsive layout (mobile-friendly sidebar)
- [x] Final visual polish pass

## Bugs / Fixes
- [x] Fix login flow — user cannot log in, needs proper auth redirect (Manus OAuth handles this on publish)

## Pedigree Enhancements
- [x] Extend pedigree viewer from 3 to 5 generations
- [x] Inbreeding coefficient (Wright's formula) calculation on backend
- [x] Inbreeding warning/badge when creating or viewing a breeding pair
- [x] Descendant view on bird detail page (all offspring listed)

## Species Enhancements & Sibling Detection
- [x] Add fledgling age (days) to species schema and seed data
- [x] Add sexual maturity age (months) to species schema and seed data
- [x] Add nest type (box/open cup/colony/ground) to species schema and seed data
- [x] Add sexing method (visual/DNA/surgical/behavioural) to species schema and seed data
- [x] Auto-calculate fledgling/weaning date on broods using fledgling age
- [x] Show nest type reminder on breeding pair cards
- [x] Show sexing method on bird detail page for monomorphic species
- [x] Show sexual maturity warning on birds not yet old enough to breed
- [x] Sibling detection query on backend (shared father OR mother)
- [x] Siblings tab on bird detail page
- [x] Sibling warning when creating a breeding pair (full or half siblings)

## Clutch Outcome Tracking, PDF Export & View Toggle
- [x] Add clutchEggs table to schema (broodId, eggNumber, outcome: fertile/infertile/cracked/hatched/died, notes)
- [x] Backend: CRUD procedures for clutch eggs
- [x] Broods UI: expandable egg outcome grid per brood (one cell per egg, click to set outcome)
- [x] Broods UI: fertility rate summary per brood (X/Y fertile, X hatched)
- [x] PDF pedigree export: server-side PDF generation of 5-gen pedigree tree
- [x] PDF export button on BirdDetail page
- [x] Birds page: grid/list view toggle (persist preference in localStorage)
- [x] Birds list view: compact table row with ring ID, species, gender, DOB, colour

## Settings, Cage Number & Edit Bug Fix
- [x] Fix edit button not working on Birds page
- [x] Add cageNumber field to birds table in DB schema
- [x] Show cage number on bird cards and in the add/edit bird dialog
- [x] Settings page: favourite species picker (multi-select from all 36 species)
- [x] Settings stored per user in DB (userSettings table)
- [x] Add Bird dialog: species dropdown filtered to favourites by default, with option to show all
- [x] Settings link in sidebar navigation

## Public SaaS Launch
### Auth Replacement
- [x] Add passwordHash, emailVerified, googleId, resetToken, resetTokenExpiry fields to users table
- [x] Add plan field (free/pro) and stripeCustomerId, stripeSubscriptionId to users table
- [x] Email/password registration endpoint with bcrypt hashing
- [x] Email verification flow (auto-verified for beta; re-enable when RESEND_API_KEY configured)
- [x] Login endpoint (email + password, returns JWT session cookie)
- [x] Google OAuth login (removed per user request — email only)
- [x] Forgot password / reset password flow
- [x] Replace Manus OAuth callback with new auth system
- [x] Update context.ts to validate JWT sessions from new auth
- [x] Update frontend Login page with register/login tabs, forgot password

### Free / Paid Tier
- [x] Free tier: max 20 birds, 5 pairs, basic features
- [x] Pro tier: unlimited birds, pairs, broods, all features
- [x] Enforce limits in backend procedures (check bird count before create)
- [x] Upgrade prompt UI when free limit is hit
- [x] Plan badge in sidebar (Free / Pro)

### Stripe Billing
- [x] Add Stripe integration via webdev_add_feature
- [x] Create Stripe products/prices (monthly + annual Pro plan)
- [x] Checkout session endpoint
- [x] Stripe webhook handler (subscription created/updated/cancelled)
- [x] Billing portal link for managing subscription
- [x] Pricing page

### Landing Page
- [x] Public landing page at / (before login)
- [x] Feature highlights, pricing table, CTA buttons
- [x] Redirect authenticated users to /dashboard

## Bug Fixes
- [x] Fix: existing Manus OAuth users cannot register with same email (no passwordHash set)
- [x] Allow legacy OAuth users to set a password via registration or a "claim account" flow
