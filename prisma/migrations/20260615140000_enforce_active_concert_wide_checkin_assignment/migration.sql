-- PostgreSQL unique constraints treat NULL values as distinct. This partial
-- index closes that gap for concert-wide active staff assignments, where
-- gate_name is NULL.
CREATE UNIQUE INDEX "checkin_staff_assignments_active_concert_wide_unique"
  ON "checkin_staff_assignments" ("staff_id", "concert_id")
  WHERE "gate_name" IS NULL AND "status" = 'ACTIVE';
