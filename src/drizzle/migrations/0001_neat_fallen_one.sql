CREATE TYPE "public"."day_of_week" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_appointment_id_unique";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."appointment_status";--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."appointment_status";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DATA TYPE "public"."appointment_status" USING "status"::"public"."appointment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'stripe', 'paypal', 'bank_transfer');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE "public"."payment_method" USING "method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE "public"."payment_status" USING "status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ALTER COLUMN "owner_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "working_hours" ALTER COLUMN "is_working" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "working_hours" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "working_hours" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "end_time" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "price_cents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "appointments_salon_id_idx" ON "appointments" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "appointments_barber_id_idx" ON "appointments" USING btree ("barber_id");--> statement-breakpoint
CREATE INDEX "appointments_customer_id_idx" ON "appointments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "appointments_appointment_at_idx" ON "appointments" USING btree ("appointment_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointments_barber_date_idx" ON "appointments" USING btree ("barber_id","appointment_at");--> statement-breakpoint
CREATE INDEX "barbers_salon_id_idx" ON "barbers" USING btree ("salon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "barbers_email_salon_idx" ON "barbers" USING btree ("email","salon_id");--> statement-breakpoint
CREATE INDEX "barbers_active_idx" ON "barbers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "customers_salon_id_idx" ON "customers" USING btree ("salon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_salon_idx" ON "customers" USING btree ("email","salon_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "payments_appointment_id_idx" ON "payments" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_method_idx" ON "payments" USING btree ("method");--> statement-breakpoint
CREATE INDEX "payments_stripe_id_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_appointment_id_idx" ON "ratings" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "ratings_rating_idx" ON "ratings" USING btree ("rating");--> statement-breakpoint
CREATE UNIQUE INDEX "salons_slug_idx" ON "salons" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "salons_email_idx" ON "salons" USING btree ("email");--> statement-breakpoint
CREATE INDEX "salons_active_idx" ON "salons" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_overrides_barber_date_idx" ON "schedule_overrides" USING btree ("barber_id","date");--> statement-breakpoint
CREATE INDEX "schedule_overrides_date_idx" ON "schedule_overrides" USING btree ("date");--> statement-breakpoint
CREATE INDEX "services_salon_id_idx" ON "services" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "services_active_idx" ON "services" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "working_hours_barber_day_idx" ON "working_hours" USING btree ("barber_id","day_of_week");--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "transaction_id";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "salons" ADD CONSTRAINT "salons_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "salons" ADD CONSTRAINT "salons_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap" CHECK ("appointments"."appointment_at" < "appointments"."end_time");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0);--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rating_valid" CHECK ("ratings"."rating" >= 1 AND "ratings"."rating" <= 5);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_price_positive" CHECK ("services"."price_cents" > 0);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0);--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_day_valid" CHECK ("working_hours"."day_of_week" >= 0 AND "working_hours"."day_of_week" <= 6);--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_time_valid" CHECK ("working_hours"."start_time" < "working_hours"."end_time");