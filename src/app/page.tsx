"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Scissors } from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: Scissors,
    title: "Expert Barbers",
    description: "Our skilled team delivers precision cuts and modern styles",
  },
  {
    icon: Calendar,
    title: "Easy Booking",
    description: "Book your appointment online in just a few clicks",
  },
  {
    icon: Clock,
    title: "Flexible Hours",
    description: "Open 6 days a week with convenient scheduling options",
  },
  {
    icon: MapPin,
    title: "Prime Location",
    description: "Easily accessible in the heart of downtown",
  },
];

const services = [
  {
    name: "Classic Haircut",
    price: "$30",
    duration: "30 min",
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=60",
  },
  {
    name: "Beard Trim",
    price: "$25",
    duration: "30 min",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60",
  },
  {
    name: "Complete Package",
    price: "$50",
    duration: "60 min",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative">
        <div className="absolute inset-0 bg-black/60" />
        <div
          className="h-[600px] bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1600&auto=format&fit=crop&q=60')",
          }}
        >
          <div className="container relative flex h-full flex-col items-center justify-center text-center text-white">
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              Modern Barbershop
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-gray-200">
              Experience the perfect blend of traditional craftsmanship and
              modern style. Our expert barbers are here to help you look and
              feel your best.
            </p>
            <Link href="/book">
              <Button size="lg" className="text-lg">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Why Choose Us?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-4 rounded-full bg-primary/10 p-4">
                    <Icon className="size-8 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">Our Services</h2>
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="group relative h-64 overflow-hidden rounded-lg bg-background"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={service.image}
                    alt={service.name}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {service.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">
                      {service.price}
                    </span>
                    <span className="text-sm text-gray-200">
                      {service.duration}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/book">
              <Button size="lg">Book Your Service</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Visit Us Today</h2>
            <p className="mb-8 text-muted-foreground">
              Located in downtown, our modern barbershop offers a comfortable
              and professional environment for all your grooming needs.
            </p>
            <div className="space-y-2">
              <p className="font-medium">123 Main Street, Downtown</p>
              <p className="font-medium">Mon-Sat: 9:00 AM - 8:00 PM</p>
              <p className="font-medium">Phone: (555) 123-4567</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Modern Barbershop. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
