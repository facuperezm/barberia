import { Resend } from "resend";
import { ConfirmationEmail } from "@/components/confirmation-email";
import { env } from "@/env";

const resend = new Resend(env.NEXT_PUBLIC_RESEND_API_KEY);

export async function sendConfirmationEmail(formData: unknown) {
  try {
    const { firstName, lastName, email, date, time, service, barber } =
      formData as {
        firstName: string;
        lastName: string;
        email: string;
        date: Date;
        time: string;
        service: string;
        barber: string;
      };

    await resend.emails.send({
      from: "Your Barbershop <appointments@yourbarbershop.com>",
      to: email,
      subject: "Your Barbershop Appointment Confirmation",
      react: ConfirmationEmail({
        firstName,
        lastName,
        date,
        time,
        service,
        barber,
      }),
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
}
