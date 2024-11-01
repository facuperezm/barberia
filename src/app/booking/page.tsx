"use client";

import { BookingForm } from "@/app/booking/_components/booking-form";
import { BookingProvider } from "@/app/booking/_components/booking-provider";

export default function BookPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10">
        <BookingProvider>
          <BookingForm />
        </BookingProvider>
      </div>
    </div>
  );
}
