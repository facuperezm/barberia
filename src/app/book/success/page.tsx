"use client";

import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();

  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const barber = searchParams.get("barber");
  const service = searchParams.get("service");

  const formattedDate = date
    ? format(new Date(date), "EEEE, MMMM d, yyyy")
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
            <p className="font-semibold text-primary">{time}</p>
          </div>
          <div className="space-y-1">
            <p>
              with <span className="font-medium">{barber}</span>
            </p>
            <p className="text-sm text-muted-foreground">Service: {service}</p>
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
