"use client";

import { useBooking } from "@/app/booking/_components/booking-provider";
import { BarberStep } from "@/app/booking/_steps/barber-step";
import { ServiceStep } from "@/app/booking/_steps/service-step";
import { DateTimeStep } from "@/app/booking/_steps/date-time-step";
import { CustomerStep } from "@/app/booking/_steps/customer-step";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
  { title: "Choose Barber", component: BarberStep },
  { title: "Select Service", component: ServiceStep },
  { title: "Pick Date & Time", component: DateTimeStep },
  { title: "Your Details", component: CustomerStep },
];

export function BookingForm() {
  const { step, setStep, state } = useBooking();

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
              // Handle form submission
              console.log("Booking submitted:", state);
            } else {
              setStep(step + 1);
            }
          }}
          disabled={!canGoNext()}
        >
          {step === steps.length - 1 ? "Confirm Booking" : "Next"}
        </Button>
      </div>
    </div>
  );
}
