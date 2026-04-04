-- Backfill: set birds in active/breeding pairs to "breeding" status
UPDATE "birds" SET "status" = 'breeding'
WHERE "id" IN (
  SELECT "maleId" FROM "breedingPairs" WHERE "status" IN ('active', 'breeding')
  UNION
  SELECT "femaleId" FROM "breedingPairs" WHERE "status" IN ('active', 'breeding')
)
AND "status" NOT IN ('deceased', 'sold');
