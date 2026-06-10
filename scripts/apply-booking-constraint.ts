/**
 * Applies the no-double-booking exclusion constraint.
 * Idempotent — safe to re-run (e.g. after a db:push that drops it).
 *
 * Run: pnpm tsx --env-file .env scripts/apply-booking-constraint.ts
 */
import { db } from "../src/drizzle";
import { sql } from "drizzle-orm";

async function main() {
  // 1. Report existing overlaps that would block the constraint
  const conflicts = await db.execute(sql`
    SELECT a.id AS appointment_a, b.id AS appointment_b, a.barber_id
    FROM appointments a
    JOIN appointments b
      ON a.barber_id = b.barber_id
     AND a.id < b.id
     AND a.appointment_at < b.end_time
     AND a.end_time > b.appointment_at
    WHERE a.status NOT IN ('cancelled', 'no_show')
      AND b.status NOT IN ('cancelled', 'no_show')
      AND a.appointment_at IS NOT NULL AND a.end_time IS NOT NULL
      AND b.appointment_at IS NOT NULL AND b.end_time IS NOT NULL
  `);

  if (conflicts.rows.length > 0) {
    console.error("Cannot apply constraint: overlapping appointments exist.");
    console.error("Resolve these first (cancel one of each pair):");
    console.table(conflicts.rows);
    process.exit(1);
  }

  // 2. Apply the constraint
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS btree_gist`);
  await db.execute(
    sql`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_double_booking`,
  );
  await db.execute(sql`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_no_double_booking
    EXCLUDE USING gist (
      barber_id WITH =,
      tstzrange(appointment_at, end_time) WITH &&
    )
    WHERE (
      appointment_at IS NOT NULL
      AND end_time IS NOT NULL
      AND status NOT IN ('cancelled', 'no_show')
    )
  `);

  console.log("✓ appointments_no_double_booking constraint applied");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to apply constraint:", error);
  process.exit(1);
});
