"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicBarbers } from "@/server/actions/barbers";
import { getPublicServices } from "@/server/queries/services";
import {
  EMAIL_REGEX,
  MIN_NAME_LENGTH,
  MIN_PHONE_LENGTH,
} from "@/app/book/_components/booking-validation";
import { cn } from "@/lib/utils";

export function CustomerStep() {
  const { state, setState, salonId } = useBooking();

  // These resolve instantly from the cache populated by the barber/service steps.
  const { data: barbers } = useQuery({
    queryKey: ["barbers", "book", salonId],
    queryFn: () => getPublicBarbers(salonId),
    staleTime: 1000 * 60 * 10,
  });
  const { data: services } = useQuery({
    queryKey: ["services", "book", salonId],
    queryFn: () => getPublicServices(salonId),
    staleTime: 1000 * 60 * 10,
  });

  const selectedBarber = barbers?.find(
    (b) => b.id.toString() === state.barberId,
  );
  const selectedService = services?.find(
    (s) => s.id.toString() === state.serviceId,
  );
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
  });

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    
    if (touched.name && !state.customerName) {
      errs.name = "Name is required";
    } else if (touched.name && state.customerName.length < MIN_NAME_LENGTH) {
      errs.name = `Name must be at least ${MIN_NAME_LENGTH} characters`;
    }

    if (touched.email && !state.customerEmail) {
      errs.email = "Email is required";
    } else if (touched.email && !EMAIL_REGEX.test(state.customerEmail)) {
      errs.email = "Please enter a valid email";
    }

    if (touched.phone && !state.customerPhone) {
      errs.phone = "Phone number is required";
    } else if (touched.phone && state.customerPhone.length < MIN_PHONE_LENGTH) {
      errs.phone = `Phone number must be at least ${MIN_PHONE_LENGTH} digits`;
    }
    
    return errs;
  }, [state, touched]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Contact Information</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll use this information to confirm your appointment
        </p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-1">
            Full Name
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={state.customerName}
            onChange={(e) => setState({ customerName: e.target.value })}
            onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
            placeholder="John Doe"
            className={cn(errors.name && touched.name && "border-destructive")}
            aria-invalid={!!errors.name && touched.name}
            aria-describedby={errors.name && touched.name ? "name-error" : undefined}
          />
          {errors.name && touched.name && (
            <p id="name-error" className="text-sm text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1">
            Email Address
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={state.customerEmail}
            onChange={(e) => setState({ customerEmail: e.target.value })}
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            placeholder="john@example.com"
            className={cn(errors.email && touched.email && "border-destructive")}
            aria-invalid={!!errors.email && touched.email}
            aria-describedby={errors.email && touched.email ? "email-error" : undefined}
          />
          {errors.email && touched.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-1">
            Phone Number
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={state.customerPhone}
            onChange={(e) => {
              // Basic phone formatting
              const value = e.target.value.replace(/\D/g, '');
              setState({ customerPhone: value });
            }}
            onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
            placeholder="(555) 123-4567"
            className={cn(errors.phone && touched.phone && "border-destructive")}
            aria-invalid={!!errors.phone && touched.phone}
            aria-describedby={errors.phone && touched.phone ? "phone-error" : undefined}
          />
          {errors.phone && touched.phone && (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <Card className="bg-muted/50 p-4">
        <h3 className="mb-3 font-medium">Booking Summary</h3>
        <dl className="space-y-2 text-sm">
          {selectedBarber && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Barber</dt>
              <dd className="font-medium">{selectedBarber.name}</dd>
            </div>
          )}
          {selectedService && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Service</dt>
              <dd className="text-right font-medium">
                {selectedService.name}
                <span className="ml-2 text-muted-foreground">
                  ${(selectedService.priceCents / 100).toFixed(2)}
                </span>
              </dd>
            </div>
          )}
          {state.date && state.time && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Date &amp; Time</dt>
              <dd className="font-medium">
                {state.date.toLocaleDateString()} at {state.time}
              </dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
