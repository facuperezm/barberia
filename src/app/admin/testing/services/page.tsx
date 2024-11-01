"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Scissors } from "lucide-react";
import { DashboardHeader } from "@/app/admin/testing/_components/header";
import { DashboardShell } from "@/app/admin/testing/_components/shell";

// Fixed services with predefined durations
const services = [
  {
    id: "1",
    name: "Haircut",
    duration: 30,
    price: 30,
    description: "Professional haircut service",
  },
  {
    id: "2",
    name: "Shave",
    duration: 30,
    price: 25,
    description: "Traditional straight razor shave",
  },
  {
    id: "3",
    name: "Haircut + Shave",
    duration: 60,
    price: 50,
    description: "Complete grooming service",
  },
];

export default function ServicesPage() {
  const [prices, setPrices] = useState(
    services.reduce(
      (acc, service) => ({ ...acc, [service.id]: service.price }),
      {},
    ),
  );

  const handleUpdatePrice = (serviceId: string, newPrice: number) => {
    setPrices((prev) => ({ ...prev, [serviceId]: newPrice }));
  };

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Services"
        description="Manage your service offerings and prices"
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  {service.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {service.duration} minutes
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    ${prices[service.id]}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Update Price
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Price</DialogTitle>
                        <DialogDescription>
                          Set a new price for {service.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            defaultValue={prices[service.id]}
                            onChange={(e) =>
                              handleUpdatePrice(
                                service.id,
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground">
                  {service.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
