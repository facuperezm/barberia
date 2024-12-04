import { Resend } from "resend";
import AppointmentConfirmationEmail from "@/components/emails/appointment-confirmation";
import AppointmentReminderEmail from "@/components/emails/appointment-reminder";
import FeedbackRequestEmail from "@/components/emails/feedback-request";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAppointmentConfirmation({
  customerName,
  customerEmail,
  date,
  time,
  service,
  barberName,
}: {
  customerName: string;
  customerEmail: string;
  date: Date;
  time: string;
  service: string;
  barberName: string;
}) {
  try {
    await resend.emails.send({
      from: "Modern Barbershop <appointments@modern-barbershop.com>",
      to: customerEmail,
      subject: "Appointment Confirmation - Modern Barbershop",
      react: AppointmentConfirmationEmail({
        customerName,
        date: format(date, "EEEE, MMMM d, yyyy"),
        time,
        service,
        barberName,
      }),
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw error;
  }
}

export async function sendAppointmentReminder({
  customerName,
  customerEmail,
  date,
  time,
  service,
  barberName,
}: {
  customerName: string;
  customerEmail: string;
  date: Date;
  time: string;
  service: string;
  barberName: string;
}) {
  try {
    await resend.emails.send({
      from: "Modern Barbershop <appointments@modern-barbershop.com>",
      to: customerEmail,
      subject: "Reminder: Your Appointment Tomorrow - Modern Barbershop",
      react: AppointmentReminderEmail({
        customerName,
        date: format(date, "EEEE, MMMM d, yyyy"),
        time,
        service,
        barberName,
      }),
    });
  } catch (error) {
    console.error("Error sending reminder email:", error);
    throw error;
  }
}

export async function sendFeedbackRequest({
  customerName,
  customerEmail,
  date,
  barberName,
  appointmentId,
}: {
  customerName: string;
  customerEmail: string;
  date: Date;
  barberName: string;
  appointmentId: string;
}) {
  try {
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${appointmentId}`;

    await resend.emails.send({
      from: "Modern Barbershop <feedback@modern-barbershop.com>",
      to: customerEmail,
      subject: "How was your visit to Modern Barbershop?",
      react: FeedbackRequestEmail({
        customerName,
        date: format(date, "EEEE, MMMM d, yyyy"),
        barberName,
        feedbackUrl,
      }),
    });
  } catch (error) {
    console.error("Error sending feedback request:", error);
    throw error;
  }
}
