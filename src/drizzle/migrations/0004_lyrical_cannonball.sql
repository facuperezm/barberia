ALTER TABLE "ratings" DROP CONSTRAINT "ratings_appointment_id_unique";--> statement-breakpoint
ALTER TABLE "salons" DROP CONSTRAINT "salons_slug_unique";--> statement-breakpoint
ALTER TABLE "salons" DROP CONSTRAINT "salons_email_unique";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_overlap";--> statement-breakpoint
CREATE INDEX "appointments_salon_status_idx" ON "appointments" USING btree ("salon_id","status");--> statement-breakpoint
CREATE INDEX "payments_appointment_status_idx" ON "payments" USING btree ("appointment_id","status");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap" CHECK ("appointments"."appointment_at" IS NULL OR "appointments"."end_time" IS NULL OR "appointments"."appointment_at" < "appointments"."end_time");