"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { normalizeSlug } from "@/lib/slug";
import { createSalon } from "@/server/actions/salons";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugEdited ? slug : normalizeSlug(name);

  async function action(formData: FormData) {
    setError(null);
    formData.set("slug", effectiveSlug);
    const result = await createSalon(formData);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <Card className="w-full max-w-md space-y-6 p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Create your barbershop</h1>
        <p className="text-sm text-muted-foreground">
          Set up your shop to start taking bookings.
        </p>
      </div>
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="La Barbería"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Booking URL</Label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">/</span>
            <Input
              id="slug"
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(normalizeSlug(e.target.value));
              }}
              placeholder="la-barberia"
            />
            <span className="text-muted-foreground">/book</span>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full">
          Create barbershop
        </Button>
      </form>
    </Card>
  );
}
