import { db } from "@/drizzle";

export function getAppointments() {
  return db.query.appointments.findMany();
}
