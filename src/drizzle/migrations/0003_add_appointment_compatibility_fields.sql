-- Migration: Add backward compatibility fields to appointments table
-- This migration adds the missing fields that are currently being used in the code

-- Add missing columns for backward compatibility
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "date" date;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "time" time;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_name" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_email" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "customer_phone" text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "appointments_date_idx" ON "appointments" ("date");
CREATE INDEX IF NOT EXISTS "appointments_barber_date_legacy_idx" ON "appointments" ("barber_id", "date");

-- Populate the new fields from existing data if any exists
-- This handles the case where appointments already exist with appointmentAt/endTime
UPDATE "appointments" 
SET 
  "date" = DATE("appointment_at"),
  "time" = TIME("appointment_at")
WHERE "date" IS NULL AND "appointment_at" IS NOT NULL;

-- Create a function to automatically populate legacy fields when new appointments are created
CREATE OR REPLACE FUNCTION populate_appointment_legacy_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Populate legacy date/time fields from appointmentAt
  IF NEW.appointment_at IS NOT NULL THEN
    NEW.date = DATE(NEW.appointment_at);
    NEW.time = TIME(NEW.appointment_at);
  END IF;
  
  -- Populate customer fields from customer relation if customerId exists
  IF NEW.customer_id IS NOT NULL AND (NEW.customer_name IS NULL OR NEW.customer_email IS NULL) THEN
    SELECT name, email, phone INTO NEW.customer_name, NEW.customer_email, NEW.customer_phone
    FROM customers 
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate legacy fields
DROP TRIGGER IF EXISTS populate_appointment_legacy_fields_trigger ON appointments;
CREATE TRIGGER populate_appointment_legacy_fields_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION populate_appointment_legacy_fields();

-- Add constraint to ensure appointmentAt and endTime are consistent
ALTER TABLE "appointments" 
ADD CONSTRAINT "appointments_time_consistency" 
CHECK (appointment_at < end_time);

-- Add constraint to ensure salon consistency across related tables
ALTER TABLE "appointments" 
ADD CONSTRAINT "appointments_barber_salon_consistency" 
CHECK (
  NOT EXISTS (
    SELECT 1 FROM barbers b 
    WHERE b.id = barber_id AND b.salon_id != salon_id
  )
);

ALTER TABLE "appointments" 
ADD CONSTRAINT "appointments_service_salon_consistency" 
CHECK (
  NOT EXISTS (
    SELECT 1 FROM services s 
    WHERE s.id = service_id AND s.salon_id != salon_id
  )
);

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS "appointments_salon_barber_date_idx" ON "appointments" ("salon_id", "barber_id", "appointment_at");
CREATE INDEX IF NOT EXISTS "appointments_salon_status_idx" ON "appointments" ("salon_id", "status");
CREATE INDEX IF NOT EXISTS "appointments_customer_salon_idx" ON "appointments" ("customer_id", "salon_id");

-- Add comments for documentation
COMMENT ON COLUMN "appointments"."date" IS 'DEPRECATED: Legacy field for backward compatibility. Use appointment_at instead.';
COMMENT ON COLUMN "appointments"."time" IS 'DEPRECATED: Legacy field for backward compatibility. Use appointment_at instead.';
COMMENT ON COLUMN "appointments"."customer_name" IS 'DEPRECATED: Legacy field for backward compatibility. Use customer_id relation instead.';
COMMENT ON COLUMN "appointments"."customer_email" IS 'DEPRECATED: Legacy field for backward compatibility. Use customer_id relation instead.';
COMMENT ON COLUMN "appointments"."customer_phone" IS 'DEPRECATED: Legacy field for backward compatibility. Use customer_id relation instead.';