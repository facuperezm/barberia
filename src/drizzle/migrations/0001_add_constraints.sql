-- Add check constraints and unique constraints that were removed from schema
-- to avoid TypeScript conflicts

-- Check constraints for business logic validation
ALTER TABLE services 
ADD CONSTRAINT price_check CHECK (price_cents >= 0),
ADD CONSTRAINT duration_check CHECK (duration_minutes > 0);

ALTER TABLE working_hours 
ADD CONSTRAINT day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6);

ALTER TABLE ratings 
ADD CONSTRAINT rating_check CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE payments 
ADD CONSTRAINT amount_check CHECK (amount_cents >= 0);

-- Unique constraints for business logic
ALTER TABLE barbers 
ADD CONSTRAINT unique_email_per_salon UNIQUE (salon_id, email);

ALTER TABLE customers 
ADD CONSTRAINT unique_customer_email_per_salon UNIQUE (salon_id, email);

ALTER TABLE working_hours 
ADD CONSTRAINT unique_barber_day UNIQUE (barber_id, day_of_week);

ALTER TABLE schedule_overrides 
ADD CONSTRAINT unique_barber_date UNIQUE (barber_id, date);

-- Indexes for better query performance
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, appointment_at);
CREATE INDEX idx_appointments_salon_date ON appointments(salon_id, appointment_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_working_hours_barber ON working_hours(barber_id);
CREATE INDEX idx_schedule_overrides_barber_date ON schedule_overrides(barber_id, date); 