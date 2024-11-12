"use server";
import { revalidatePath } from "next/cache";
import { updateServicePrice as update } from "@/server/queries/services";

export async function updateServicePrice(formData: FormData) {
  await update(formData);
  revalidatePath("/dashboard/services");
}
