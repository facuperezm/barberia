"use client";

import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDate, formatTime, toArgentinaDate } from "@/lib/dates";
import { Suspense, useEffect, useState } from "react";
import { getPublicAppointmentById } from "@/server/actions/appointments";

interface AppointmentDetails {
  id: number;
  appointmentAt: Date | null;
  barberName: string;
  serviceName: string;
  customerName: string | null;
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingDetails />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-6 p-8 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your booking details...</p>
      </Card>
    </div>
  );
}

function BookingDetails() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointment");

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointment() {
      if (!appointmentId) {
        setError("No appointment ID provided");
        setIsLoading(false);
        return;
      }

      const result = await getPublicAppointmentById(parseInt(appointmentId));

      if (result.success && result.appointment) {
        setAppointment(result.appointment);
      } else {
        setError(result.error || "Failed to load appointment");
      }
      setIsLoading(false);
    }

    fetchAppointment();
  }, [appointmentId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg space-y-6 p-8 text-center">
          <h1 className="text-2xl font-bold">Booking Complete</h1>
          <p className="text-muted-foreground">
            Your appointment has been booked. Please check your email for details.
          </p>
          <Link href="/">
            <Button className="w-full">
              <ArrowLeft className="mr-2 size-4" />
              Return to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const formattedDate = appointment.appointmentAt
    ? formatDate(toArgentinaDate(new Date(appointment.appointmentAt)), "full")
    : "";

  const formattedTime = appointment.appointmentAt
    ? formatTime(toArgentinaDate(new Date(appointment.appointmentAt)))
    : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg space-y-6 p-8 text-center">
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <CalendarCheck className="size-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Thank You for Choosing Us!
          </h1>
          <p className="text-muted-foreground">
            Your appointment has been successfully booked
          </p>
        </div>

        <div className="space-y-4 rounded-lg bg-muted/50 p-6">
          <div className="space-y-2">
            <p className="text-lg font-medium">{formattedDate}</p>
            <p className="font-semibold text-primary">{formattedTime}</p>
          </div>
          <div className="space-y-1">
            <p>
              with <span className="font-medium">{appointment.barberName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Service: {appointment.serviceName}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" />
            <p>Please check your email for confirmation details</p>
          </div>

          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="mr-2 size-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
