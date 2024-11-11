import { db } from "@/db";
import { eq } from "drizzle-orm";
import { services } from "@/db/schema";

export function getServices() {
  return db.query.services.findMany();
}

export function updateServicePrice(formData: FormData) {
  return db
    .update(services)
    .set({ price: Number(formData.get("price")) })
    .where(eq(services.id, Number(formData.get("serviceId"))));
}
