import { notFound } from "next/navigation";
import { getPublicSalonBySlug } from "@/server/actions/barbers";
import { BookingForm } from "@/app/book/_components/booking-form";
import { BookingProvider } from "@/app/book/_components/booking-provider";

export default async function SalonBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getPublicSalonBySlug(slug);
  if (!salon) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10">
        <h1 className="mb-6 text-center text-2xl font-bold">{salon.name}</h1>
        <BookingProvider salonId={salon.id}>
          <BookingForm />
        </BookingProvider>
      </div>
    </div>
  );
}
