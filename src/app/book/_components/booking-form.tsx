"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { BarberStep } from "@/app/book/_steps/barber-step";
import { ServiceStep } from "@/app/book/_steps/service-step";
import { DateTimeStep } from "@/app/book/_steps/date-time-step";
import { CustomerStep } from "@/app/book/_steps/customer-step";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBookingAction } from "@/server/actions/bookings";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, User, Scissors } from "lucide-react";

const steps = [
  { 
    title: "Choose Barber", 
    component: BarberStep,
    icon: User,
    description: "Select your preferred barber"
  },
  { 
    title: "Select Service", 
    component: ServiceStep,
    icon: Scissors,
    description: "Choose the service you need"
  },
  { 
    title: "Pick Date & Time", 
    component: DateTimeStep,
    icon: Clock,
    description: "Find an available time slot"
  },
  { 
    title: "Your Details", 
    component: CustomerStep,
    icon: CheckCircle,
    description: "Complete your booking information"
  },
];

export function BookingForm() {
  const { step, setStep, state, resetBooking } = useBooking();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!state.barberId;
      case 1:
        return !!state.serviceId;
      case 2:
        return !!state.date && !!state.time;
      case 3:
        return (
          !!state.customerName && 
          !!state.customerEmail && 
          !!state.customerPhone &&
          // Basic email validation
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customerEmail) &&
          // Basic phone validation
          state.customerPhone.length >= 10
        );
      default:
        return false;
    }
  }, [step, state]);

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        if (!state.date) {
          throw new Error("Please select a date");
        }

        const result = await createBookingAction({
          barberId: parseInt(state.barberId),
          serviceId: parseInt(state.serviceId),
          customerName: state.customerName,
          customerEmail: state.customerEmail,
          customerPhone: state.customerPhone,
          date: state.date.toISOString().split("T")[0],
          time: state.time,
        });

        if (!result.success) {
          if (result.errors) {
            // Show validation errors
            const firstError = Object.values(result.errors)[0]?.[0];
            toast.error(firstError || "Please check your information");
          } else {
            toast.error(result.error || "Failed to book appointment");
          }
          return;
        }

        if (result.redirectUrl) {
          // Redirect to payment
          window.location.href = result.redirectUrl;
        } else {
          // No payment required, redirect to success
          toast.success("Appointment booked successfully!");
          router.push(`/book/success?appointment=${result.appointmentId}`);
        }
      } catch (error) {
        console.error("Booking error:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  const CurrentStep = steps[step].component;
  const currentStepInfo = steps[step];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Book Your Appointment</h1>
              <p className="text-muted-foreground">
                {currentStepInfo.description}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{step + 1}</span>
              <span>/</span>
              <span>{steps.length}</span>
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => {
              const Icon = s.icon;
              const isActive = index === step;
              const isCompleted = index < step;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-1 items-center gap-2",
                    index < steps.length - 1 && "relative"
                  )}
                >
                  <button
                    onClick={() => index < step && setStep(index)}
                    disabled={index > step}
                    className={cn(
                      "relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isCompleted && "border-primary bg-primary/10 text-primary",
                      !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className="absolute left-10 right-0 top-5 h-0.5 -z-10">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6">
        <CurrentStep />
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || isPending}
          className="min-w-[100px]"
        >
          Previous
        </Button>
        
        <div className="flex gap-2">
          {step === steps.length - 1 && (
            <Button
              variant="outline"
              onClick={resetBooking}
              disabled={isPending}
            >
              Start Over
            </Button>
          )}
          
          <Button
            onClick={() => {
              if (step === steps.length - 1) {
                handleSubmit();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={!canGoNext || isPending}
            className="min-w-[120px]"
          >
            {step === steps.length - 1
              ? isPending
                ? "Processing..."
                : "Complete Booking"
              : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
