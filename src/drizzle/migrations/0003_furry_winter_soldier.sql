ALTER TYPE "public"."payment_method" ADD VALUE 'mercadopago';--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "appointment_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "end_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "date" date;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "time" time;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "customer_email" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_payment_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_preference_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_payment_method_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_payment_type" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_installments" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_card_last_four_digits" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_payer_email" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_processing_mode" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_operation_type" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_external_reference" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_transaction_details" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_status_detail" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "mercadopago_failure_reason" text;--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "appointments_barber_date_legacy_idx" ON "appointments" USING btree ("barber_id","date");--> statement-breakpoint
CREATE INDEX "payments_mercadopago_payment_id_idx" ON "payments" USING btree ("mercadopago_payment_id");--> statement-breakpoint
CREATE INDEX "payments_mercadopago_preference_id_idx" ON "payments" USING btree ("mercadopago_preference_id");--> statement-breakpoint
CREATE INDEX "payments_mercadopago_external_ref_idx" ON "payments" USING btree ("mercadopago_external_reference");