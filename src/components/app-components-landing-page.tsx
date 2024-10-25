"use client";

import { Button } from "@/components/ui/button";
import { ReservationForm } from "@/components/reservation-form";

export function LandingPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={() => setShowReservationForm(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-x"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
        <ReservationForm />
      </div>
    </div>
  );
}
