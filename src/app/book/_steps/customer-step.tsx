"use client";

import { useBooking } from "@/app/book/_components/booking-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export function CustomerStep() {
  const { state, setState } = useBooking();
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
  });

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    
    if (touched.name && !state.customerName) {
      errs.name = "Name is required";
    } else if (touched.name && state.customerName.length < 2) {
      errs.name = "Name must be at least 2 characters";
    }
    
    if (touched.email && !state.customerEmail) {
      errs.email = "Email is required";
    } else if (touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customerEmail)) {
      errs.email = "Please enter a valid email";
    }
    
    if (touched.phone && !state.customerPhone) {
      errs.phone = "Phone number is required";
    } else if (touched.phone && state.customerPhone.length < 10) {
      errs.phone = "Phone number must be at least 10 digits";
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
        <h3 className="mb-2 font-medium">Booking Summary</h3>
        <div className="space-y-1 text-sm">
          {state.barberId && (
            <p><span className="text-muted-foreground">Barber:</span> Selected</p>
          )}
          {state.serviceId && (
            <p><span className="text-muted-foreground">Service:</span> Selected</p>
          )}
          {state.date && state.time && (
            <p>
              <span className="text-muted-foreground">Date & Time:</span>{" "}
              {state.date.toLocaleDateString()} at {state.time}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
