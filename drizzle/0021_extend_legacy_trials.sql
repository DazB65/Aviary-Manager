-- One-off data fix. The free trial was 7 days until 28 May 2026 (commit cf09b17),
-- when it became 30 days. Accounts that signed up before then got the short
-- trial. Give every such still-free account a fresh 30-day trial from deploy
-- time. The final predicate makes this extend-only: it never shortens a trial
-- that already ends later than 30 days out, and it skips paid (starter/pro)
-- accounts entirely.
UPDATE "users"
SET "planExpiresAt" = (now() AT TIME ZONE 'UTC') + interval '30 days'
WHERE "plan" = 'free'
  AND "createdAt" < timestamp '2026-05-29 00:00:00'
  AND ("planExpiresAt" IS NULL OR "planExpiresAt" < (now() AT TIME ZONE 'UTC') + interval '30 days');
