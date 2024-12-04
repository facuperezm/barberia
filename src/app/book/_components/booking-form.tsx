"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { BarberStep } from "@/app/book/_steps/barber-step";
import { ServiceStep } from "@/app/book/_steps/service-step";
import { DateTimeStep } from "@/app/book/_steps/date-time-step";
import { CustomerStep } from "@/app/book/_steps/customer-step";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  { title: "Choose Barber", component: BarberStep },
  { title: "Select Service", component: ServiceStep },
  { title: "Pick Date & Time", component: DateTimeStep },
  { title: "Your Details", component: CustomerStep },
];

export function BookingForm() {
  const { step, setStep, state, resetBooking } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const canGoNext = () => {
    switch (step) {
      case 0:
        return !!state.barberId;
      case 1:
        return !!state.serviceId;
      case 2:
        return !!state.date && !!state.time;
      case 3:
        return (
          !!state.customerName && !!state.customerEmail && !!state.customerPhone
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // First, verify the slot is still available
      const formattedDate = state.date?.toISOString().split("T")[0];
      const availabilityResponse = await fetch(
        `/api/availability?date=${formattedDate}&barberId=${state.barberId}&serviceId=${state.serviceId}`,
      );

      if (!availabilityResponse.ok) {
        throw new Error("Failed to verify availability");
      }

      const slots = await availabilityResponse.json();
      const isSlotAvailable = slots.find(
        (slot: { time: string; available: boolean }) =>
          slot.time === state.time && slot.available,
      );

      if (!isSlotAvailable) {
        toast.error(
          "This time slot is no longer available. Please select another time.",
        );
        setStep(2); // Go back to date/time selection
        return;
      }

      // Proceed with booking
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barberId: parseInt(state.barberId),
          serviceId: parseInt(state.serviceId),
          customerName: state.customerName,
          customerEmail: state.customerEmail,
          customerPhone: state.customerPhone,
          date: state.date,
          time: state.time,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }

      // Get barber and service names from your data
      const barberName = state.barberId === "1" ? "John Doe" : "Jane Smith";
      const serviceName =
        state.serviceId === "1"
          ? "Classic Haircut"
          : state.serviceId === "2"
            ? "Beard Trim"
            : "Full Service";

      // Redirect to success page with booking details
      router.push(
        `/book/success?` +
          `date=${state.date?.toISOString()}` +
          `&time=${state.time}` +
          `&barber=${encodeURIComponent(barberName)}` +
          `&service=${encodeURIComponent(serviceName)}`,
      );

      resetBooking();
    } catch (error) {
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStep = steps[step].component;

  return (
    <div className="rounded-lg border bg-card p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Book Your Appointment</h1>
        <p className="text-muted-foreground">
          Step {step + 1} of {steps.length}: {steps[step].title}
        </p>
        <Progress value={((step + 1) / steps.length) * 100} className="mt-4" />
      </div>

      <CurrentStep />

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          Previous
        </Button>
        <Button
          onClick={() => {
            if (step === steps.length - 1) {
              handleSubmit();
            } else {
              setStep(step + 1);
            }
          }}
          disabled={!canGoNext() || isSubmitting}
        >
          {step === steps.length - 1
            ? isSubmitting
              ? "Booking..."
              : "Confirm Booking"
            : "Next"}
        </Button>
      </div>
    </div>
  );
}
