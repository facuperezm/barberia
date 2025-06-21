"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import Link from "next/link";

export default function PaymentPendingPage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointment");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-yellow-500">
            <Clock size={64} />
          </div>
          <CardTitle className="text-2xl text-yellow-600">Payment Pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your payment is being processed. We&apos;ll notify you once it&apos;s confirmed.
          </p>
          
          <p className="text-sm text-muted-foreground">
            Your appointment is temporarily reserved while we process your payment.
          </p>
          
          {appointmentId && (
            <p className="text-sm text-muted-foreground">
              Appointment ID: {appointmentId}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/book">Book Another Appointment</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 