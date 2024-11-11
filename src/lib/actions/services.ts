"use server";
import { revalidatePath } from "next/cache";
import { updateServicePrice as update } from "@/server/db/services";

export async function updateServicePrice(formData: FormData) {
  await update(formData);
  revalidatePath("/dashboard/services");
}
