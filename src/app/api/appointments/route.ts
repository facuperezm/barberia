import { NextResponse } from "next/server";
import { createAppointment } from "@/server/actions/appointments";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Convert JSON data to FormData format that the server action expects
    const formData = new FormData();
    formData.append("barberId", data.barberId?.toString() || "");
    formData.append("serviceId", data.serviceId?.toString() || "");
    formData.append("customerName", data.customerName || "");
    formData.append("customerEmail", data.customerEmail || "");
    formData.append("customerPhone", data.customerPhone || "");
    
    // Handle date conversion
    if (data.date) {
      const date = new Date(data.date);
      formData.append("date", date.toISOString().split("T")[0]);
    }
    
    formData.append("time", data.time || "");

    const result = await createAppointment(formData);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        errors: result.errors 
      }, { status: 400 });
    }

    return NextResponse.json(result.appointment);
  } catch (error) {
    console.error("API appointment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 },
    );
  }
}
