"use client";

import { createContext, useContext, useState } from "react";

interface BookingState {
  barberId: string;
  serviceId: string;
  date: Date | null;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

interface BookingContextType {
  state: BookingState;
  setState: (state: Partial<BookingState>) => void;
  step: number;
  setStep: (step: number) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setBookingState] = useState<BookingState>({
    barberId: "",
    serviceId: "",
    date: null,
    time: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  const [step, setStep] = useState(0);

  const setState = (newState: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...newState }));
  };

  return (
    <BookingContext.Provider value={{ state, setState, step, setStep }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
