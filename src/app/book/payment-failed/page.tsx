"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointment");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-red-500">
            <XCircle size={64} />
          </div>
          <CardTitle className="text-2xl text-red-600">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Unfortunately, your payment could not be processed. Your appointment has been cancelled.
          </p>

          {appointmentId && (
            <p className="text-sm text-muted-foreground">
              Appointment ID: {appointmentId}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link href="/book">Try Again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
} 