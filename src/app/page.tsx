"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Scissors, Star, Phone } from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: Scissors,
    title: "Master Craftsmen",
    description:
      "Our barbers bring decades of combined experience and an unwavering commitment to precision.",
  },
  {
    icon: Calendar,
    title: "Effortless Booking",
    description:
      "Reserve your chair in seconds with our streamlined online scheduling system.",
  },
  {
    icon: Clock,
    title: "Your Schedule",
    description:
      "Six days a week, extended hours. We work around your life, not the other way around.",
  },
  {
    icon: MapPin,
    title: "Prime Location",
    description:
      "Nestled in the heart of downtown, where convenience meets sophistication.",
  },
];

const services = [
  {
    name: "The Classic Cut",
    price: "$30",
    duration: "30 min",
    description: "Timeless precision tailored to your features",
    image:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&auto=format&fit=crop&q=60",
  },
  {
    name: "Beard Sculpting",
    price: "$25",
    duration: "30 min",
    description: "Expert shaping and conditioning for the distinguished gentleman",
    image:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60",
  },
  {
    name: "The Full Experience",
    price: "$50",
    duration: "60 min",
    description: "Cut, beard work, hot towel treatment, and styling",
    image:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60",
  },
];

const testimonials = [
  {
    name: "Michael Torres",
    role: "Regular Client",
    quote:
      "After years of mediocre haircuts, I finally found a place that understands what quality means. The attention to detail is unmatched.",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "First-Time Visitor",
    quote:
      "Walked in for a quick trim, left feeling like a new man. The atmosphere alone is worth the visit.",
    rating: 5,
  },
  {
    name: "James Wilson",
    role: "Monthly Member",
    quote:
      "This isn't just a barbershop—it's an experience. The craftsmanship here is something special.",
    rating: 5,
  },
];

export default function Home() {
  return (
    <div className="noise-overlay min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-amber-600">
              <Scissors className="h-5 w-5 text-black" />
            </div>
            <span className="font-display text-lg tracking-wide">
              The Gentleman&apos;s Quarter
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="#services"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-amber-500 md:block"
            >
              Services
            </Link>
            <Link
              href="#about"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-amber-500 md:block"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-amber-500 md:block"
            >
              Contact
            </Link>
            <Link href="/book">
              <Button variant="gold" size="sm">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen overflow-hidden pt-16">
        {/* Background stripe pattern */}
        <div className="stripe-pattern absolute inset-0" />

        {/* Animated barbershop stripe accent */}
        <div className="absolute bottom-0 left-0 top-0 w-3 stripe-animated" />

        {/* Content */}
        <div className="container relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-center py-20 lg:flex-row lg:items-center lg:gap-16">
          {/* Left content */}
          <div className="flex-1 space-y-8">
            <div className="animate-fade-up space-y-2">
              <span className="inline-block border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-amber-500">
                Est. 2024 • Downtown
              </span>
            </div>

            <h1 className="animate-fade-up delay-100 font-display text-5xl font-medium leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
              Where{" "}
              <span className="text-gold-gradient">Tradition</span>
              <br />
              Meets <span className="italic">Craft</span>
            </h1>

            <p className="animate-fade-up delay-200 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Step into a sanctuary of refined grooming. Our master barbers
              blend time-honored techniques with contemporary style, delivering
              an experience as distinguished as our clientele.
            </p>

            <div className="animate-fade-up delay-300 flex flex-col gap-4 sm:flex-row">
              <Link href="/book">
                <Button variant="gold" size="xl" className="w-full sm:w-auto">
                  Reserve Your Chair
                </Button>
              </Link>
              <Link href="#services">
                <Button
                  variant="gold-outline"
                  size="xl"
                  className="w-full sm:w-auto"
                >
                  Explore Services
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-up delay-400 flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-500 text-amber-500"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  5.0 on Google
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                500+ Happy Clients
              </span>
            </div>
          </div>

          {/* Right content - Image */}
          <div className="animate-slide-left delay-300 relative mt-12 flex-1 lg:mt-0">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
              {/* Gold frame accent */}
              <div className="absolute -inset-1 rounded-sm bg-gradient-to-br from-amber-500/50 via-transparent to-amber-500/50" />
              <div className="absolute inset-0 rounded-sm bg-background" />

              <Image
                src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&auto=format&fit=crop&q=80"
                alt="Master barber at work"
                fill
                className="object-cover"
                priority
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              {/* Floating badge */}
              <div className="absolute bottom-6 left-6 right-6 rounded border border-border/50 bg-background/90 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg">Next Available</p>
                    <p className="text-sm text-muted-foreground">Today, 3:30 PM</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500">
                    <Calendar className="h-5 w-5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-amber-500/50 p-2">
            <div className="h-2 w-1 rounded-full bg-amber-500" />
          </div>
        </div>
      </header>

      {/* Gold divider */}
      <div className="gold-line" />

      {/* Features Section */}
      <section id="about" className="py-24 lg:py-32">
        <div className="container">
          <div className="mb-16 max-w-2xl">
            <span className="mb-4 inline-block text-sm uppercase tracking-[0.2em] text-amber-500">
              Why Choose Us
            </span>
            <h2 className="font-display text-4xl font-medium leading-tight md:text-5xl">
              Craftsmanship in
              <br />
              <span className="italic text-amber-500">Every Detail</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="hover-lift gold-glow group rounded border border-border bg-card p-8 transition-all"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded border border-amber-500/30 bg-amber-500/10 transition-all group-hover:border-amber-500 group-hover:bg-amber-500">
                    <Icon className="h-6 w-6 text-amber-500 transition-colors group-hover:text-black" />
                  </div>
                  <h3 className="mb-3 font-display text-xl">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="bg-card py-24 lg:py-32">
        <div className="container">
          <div className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <span className="mb-4 inline-block text-sm uppercase tracking-[0.2em] text-amber-500">
                Our Services
              </span>
              <h2 className="font-display text-4xl font-medium leading-tight md:text-5xl">
                Signature <span className="italic">Experiences</span>
              </h2>
            </div>
            <Link href="/book">
              <Button variant="gold-outline">View All Services</Button>
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="hover-lift group relative overflow-hidden rounded bg-background"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

                  {/* Duration badge */}
                  <div className="absolute right-4 top-4 rounded bg-black/80 px-3 py-1 text-xs backdrop-blur-sm">
                    {service.duration}
                  </div>
                </div>

                <div className="relative p-6">
                  <div className="absolute -top-8 right-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 font-display text-xl font-semibold text-black shadow-lg">
                    {service.price}
                  </div>
                  <h3 className="mb-2 font-display text-2xl">{service.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                  <Link
                    href="/book"
                    className="inline-flex items-center text-sm text-amber-500 transition-colors hover:text-amber-400"
                  >
                    Book Now
                    <span className="ml-2 transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        {/* Large quote mark decoration */}
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 select-none font-display text-[20rem] leading-none text-amber-500/5">
          &ldquo;
        </div>

        <div className="container relative">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block text-sm uppercase tracking-[0.2em] text-amber-500">
              Testimonials
            </span>
            <h2 className="font-display text-4xl font-medium leading-tight md:text-5xl">
              Words from Our <span className="italic">Clientele</span>
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="hover-lift rounded border border-border bg-card p-8"
              >
                <div className="mb-6 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-500 text-amber-500"
                    />
                  ))}
                </div>
                <blockquote className="mb-6 font-display text-lg italic leading-relaxed">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 font-display text-lg text-amber-500">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 py-24 lg:py-32">
        {/* Stripe pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="stripe-pattern h-full w-full" />
        </div>

        <div className="container relative text-center">
          <h2 className="mb-6 font-display text-4xl font-medium text-black md:text-5xl lg:text-6xl">
            Ready for Your
            <br />
            <span className="italic">Transformation?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-black/70">
            Your perfect look is just an appointment away. Join the ranks of
            distinguished gentlemen who trust their grooming to the best.
          </p>
          <Link href="/book">
            <Button
              size="xl"
              className="bg-black text-white hover:bg-black/90 hover:shadow-2xl"
            >
              Book Your Appointment
            </Button>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 lg:py-32">
        <div className="container">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-block text-sm uppercase tracking-[0.2em] text-amber-500">
                Visit Us
              </span>
              <h2 className="mb-8 font-display text-4xl font-medium leading-tight md:text-5xl">
                Your <span className="italic">Destination</span>
                <br />
                Awaits
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-amber-500/30 bg-amber-500/10">
                    <MapPin className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium">Address</h3>
                    <p className="text-muted-foreground">
                      123 Main Street, Downtown
                      <br />
                      New York, NY 10001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-amber-500/30 bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium">Hours</h3>
                    <p className="text-muted-foreground">
                      Monday – Friday: 9:00 AM – 8:00 PM
                      <br />
                      Saturday: 9:00 AM – 6:00 PM
                      <br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-amber-500/30 bg-amber-500/10">
                    <Phone className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium">Contact</h3>
                    <p className="text-muted-foreground">
                      (555) 123-4567
                      <br />
                      hello@gentlemansquarter.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="relative overflow-hidden rounded border border-border bg-card">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=60')] bg-cover bg-center opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              <div className="relative flex aspect-square items-center justify-center p-8 lg:aspect-auto lg:h-full">
                <div className="text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500">
                    <MapPin className="h-8 w-8 text-black" />
                  </div>
                  <p className="font-display text-xl">Downtown Location</p>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Easy parking • Metro accessible
                  </p>
                  <Button variant="gold-outline" size="sm">
                    Get Directions
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-amber-600">
                <Scissors className="h-5 w-5 text-black" />
              </div>
              <span className="font-display text-lg tracking-wide">
                The Gentleman&apos;s Quarter
              </span>
            </div>

            <div className="flex items-center gap-8">
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-amber-500"
              >
                Instagram
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-amber-500"
              >
                Facebook
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground transition-colors hover:text-amber-500"
              >
                Twitter
              </Link>
            </div>
          </div>

          <div className="gold-line my-8" />

          <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} The Gentleman&apos;s Quarter. All
              rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
