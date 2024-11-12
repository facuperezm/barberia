import { db } from "@/db";

export function getAppointments() {
  return db.query.appointments.findMany();
}
