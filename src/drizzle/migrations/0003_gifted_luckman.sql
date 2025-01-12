-- First, create the enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the existing status column
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "status";

-- Add the new status column with the enum type
ALTER TABLE "appointments" 
ADD COLUMN "status" appointment_status DEFAULT 'pending' NOT NULL;