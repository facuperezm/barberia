import React from "react";
import StepNavigation from "@/components/step-navigation";
import { AddReservationContextProvider } from "@/context/add-reservation";
import PageHeader from "@/components/page-header";

export default function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full px-2 lg:px-0">
      <PageHeader
        title="Reserva tu turno"
        subtitle="Complete los siguientes pasos para reservar tu turno"
      />

      <div className="mb-28 mt-20 flex flex-col gap-x-16 text-white lg:flex-row">
        <StepNavigation />
        <AddReservationContextProvider>
          <div className="w-full">{children}</div>
        </AddReservationContextProvider>
      </div>
    </div>
  );
}
