"use client";

import { useBooking } from "@/app/booking/_components/booking-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerStep() {
  const { state, setState } = useBooking();

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={state.customerName}
          onChange={(e) => setState({ customerName: e.target.value })}
          placeholder="John Doe"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={state.customerEmail}
          onChange={(e) => setState({ customerEmail: e.target.value })}
          placeholder="john@example.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={state.customerPhone}
          onChange={(e) => setState({ customerPhone: e.target.value })}
          placeholder="+1 (555) 000-0000"
        />
      </div>
    </div>
  );
}
