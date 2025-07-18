"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface BookingState {
  barberId: string;
  serviceId: string;
  date: Date | null;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

const initialState: BookingState = {
  barberId: "",
  serviceId: "",
  date: null,
  time: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

interface BookingContextType {
  state: BookingState;
  setState: (state: Partial<BookingState>) => void;
  step: number;
  setStep: (step: number) => void;
  resetBooking: () => void;
  goToStep: (step: number) => void;
  canNavigateToStep: (targetStep: number) => boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setBookingState] = useState<BookingState>(initialState);
  const [step, setStepState] = useState(0);

  const setState = useCallback((newState: Partial<BookingState>) => {
    setBookingState((prev) => ({ ...prev, ...newState }));
  }, []);

  const resetBooking = useCallback(() => {
    setBookingState(initialState);
    setStepState(0);
  }, []);

  const setStep = useCallback((newStep: number) => {
    setStepState(newStep);
  }, []);

  const canNavigateToStep = useCallback((targetStep: number) => {
    if (targetStep === 0) return true;
    
    // Check if previous steps are completed
    for (let i = 0; i < targetStep; i++) {
      switch (i) {
        case 0:
          if (!state.barberId) return false;
          break;
        case 1:
          if (!state.serviceId) return false;
          break;
        case 2:
          if (!state.date || !state.time) return false;
          break;
      }
    }
    return true;
  }, [state]);

  const goToStep = useCallback((targetStep: number) => {
    if (canNavigateToStep(targetStep)) {
      setStep(targetStep);
    }
  }, [canNavigateToStep, setStep]);

  return (
    <BookingContext.Provider
      value={{ 
        state, 
        setState, 
        step, 
        setStep, 
        resetBooking,
        goToStep,
        canNavigateToStep
      }}
    >
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
