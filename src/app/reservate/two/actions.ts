"use server";
import { stepTwoSchema } from "@/context/schemas";
import { ReservateRoutes, type FormErrors } from "@/context/types";
import { redirect } from "next/navigation";

export async function stepTwoFormAction(
  prevState: FormErrors | undefined,
  formData: FormData,
): Promise<FormErrors | undefined> {
  const data = Object.fromEntries(formData.entries());
  const validated = stepTwoSchema.safeParse(data);
  if (!validated.success) {
    const errors = validated.error.issues.reduce((acc: FormErrors, issue) => {
      const path = issue.path[0] as string;
      acc[path] = issue.message;
      return acc;
    }, {});
    return errors;
  }

  redirect(ReservateRoutes.THIRD);
}
