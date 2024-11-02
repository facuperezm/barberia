"use client";

import { BookingForm } from "@/app/book/_components/booking-form";
import { BookingProvider } from "@/app/book/_components/booking-provider";

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
