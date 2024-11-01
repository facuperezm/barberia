"use server";
import { stepOneSchema } from "@/context/schemas";
import { redirect } from "next/navigation";
import { type FormErrors, ReservateRoutes } from "@/context/types";

export async function stepOneFormAction(
  prevState: { [key: string]: string | undefined },
  formData: FormData,
): Promise<{ [key: string]: string | undefined }> {
  const data = Object.fromEntries(formData.entries());
  const validated = stepOneSchema.safeParse(data);
  if (!validated.success) {
    const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
      const path = issue.path[0] as string;
      acc[path] = issue.message;
      return acc;
    }, {});
    return errors;
  }

  redirect(ReservateRoutes.SECOND);
}
