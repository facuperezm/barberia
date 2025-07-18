-- Migration: Add missing appointment fields to match current code usage
-- This migration ensures the database schema matches what the code expects

-- Add the missing columns that the code is currently using
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "date" date;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "time" time;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_phone" text;

-- Add the proper timestamp columns for future use
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_at" timestamp with time zone;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "end_time" timestamp with time zone;

-- Make sure notes column exists
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "notes" text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "appointments_date_idx" ON "appointments" ("date");
CREATE INDEX IF NOT EXISTS "appointments_barber_date_idx" ON "appointments" ("barber_id", "date");
CREATE INDEX IF NOT EXISTS "appointments_salon_date_idx" ON "appointments" ("salon_id", "date");
CREATE INDEX IF NOT EXISTS "appointments_appointment_at_idx" ON "appointments" ("appointment_at");
CREATE INDEX IF NOT EXISTS "appointments_barber_appointment_at_idx" ON "appointments" ("barber_id", "appointment_at");

-- Add constraints for data integrity
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_time_consistency";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_time_consistency" 
CHECK (appointment_at IS NULL OR end_time IS NULL OR appointment_at < end_time);

-- If you have existing data, populate the new timestamp fields from date/time
UPDATE "appointments" 
SET 
  "appointment_at" = CASE 
    WHEN "date" IS NOT NULL AND "time" IS NOT NULL 
    THEN ("date"::text || ' ' || "time"::text)::timestamp with time zone
    ELSE NULL
  END
WHERE "appointment_at" IS NULL AND "date" IS NOT NULL AND "time" IS NOT NULL;

-- Populate end_time by looking up service duration
UPDATE "appointments" 
SET "end_time" = "appointment_at" + (s.duration_minutes || ' minutes')::interval
FROM "services" s
WHERE "appointments"."service_id" = s.id 
  AND "appointments"."appointment_at" IS NOT NULL 
  AND "appointments"."end_time" IS NULL;

-- Add some helpful comments
COMMENT ON COLUMN "appointments"."date" IS 'Legacy field - currently used by application code';
COMMENT ON COLUMN "appointments"."time" IS 'Legacy field - currently used by application code';
COMMENT ON COLUMN "appointments"."customer_name" IS 'Legacy field - currently used by application code';
COMMENT ON COLUMN "appointments"."customer_email" IS 'Legacy field - currently used by application code';
COMMENT ON COLUMN "appointments"."customer_phone" IS 'Legacy field - currently used by application code';
COMMENT ON COLUMN "appointments"."appointment_at" IS 'Proper timestamp field - will replace date/time in future';
COMMENT ON COLUMN "appointments"."end_time" IS 'Calculated end time based on service duration';