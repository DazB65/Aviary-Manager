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
- [ ] Fix login flow — user cannot log in, needs proper auth redirect
