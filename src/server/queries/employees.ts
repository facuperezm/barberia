import { db } from "@/drizzle";
import { barbers } from "@/drizzle/schema";
import { asc } from "drizzle-orm";

export interface Employee {
  id: number;
  name: string;
}

export async function getAllEmployees(): Promise<Employee[]> {
  const result = await db.select().from(barbers).orderBy(asc(barbers.name));
  return result.map((emp: typeof barbers.$inferSelect) => ({
    id: emp.id,
    name: emp.name,
  }));
}
