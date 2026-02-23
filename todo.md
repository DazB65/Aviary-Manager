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
