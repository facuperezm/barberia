"use client";

import { useState } from "react";
import { DashboardHeader } from "@/app/(dashboard)/dashboard/_components/header";
import { DashboardShell } from "@/app/(dashboard)/dashboard/_components/shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2 } from "lucide-react";

// Mock data - replace with API call
const initialBarbers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 000-0000",
    imageUrl:
      "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1 (555) 000-0001",
    imageUrl:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&auto=format&fit=crop",
  },
];

export default function BarbersPage() {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [newBarber, setNewBarber] = useState({
    name: "",
    email: "",
    phone: "",
    imageUrl: "",
  });

  const handleAddBarber = () => {
    if (!newBarber.name || !newBarber.email) return;

    setBarbers([
      ...barbers,
      {
        id: (barbers.length + 1).toString(),
        ...newBarber,
      },
    ]);

    setNewBarber({
      name: "",
      email: "",
      phone: "",
      imageUrl: "",
    });
  };

  const handleDeleteBarber = (id: string) => {
    setBarbers(barbers.filter((barber) => barber.id !== id));
  };

  return (
    <DashboardShell>
      <DashboardHeader heading="Barbers" description="Manage your barber team">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Barber
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Barber</DialogTitle>
              <DialogDescription>
                Add a new barber to your team
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newBarber.name}
                  onChange={(e) =>
                    setNewBarber({ ...newBarber, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newBarber.email}
                  onChange={(e) =>
                    setNewBarber({ ...newBarber, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newBarber.phone}
                  onChange={(e) =>
                    setNewBarber({ ...newBarber, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="imageUrl">Profile Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={newBarber.imageUrl}
                  onChange={(e) =>
                    setNewBarber({ ...newBarber, imageUrl: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddBarber}>Add Barber</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <Card key={barber.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={barber.imageUrl} alt={barber.name} />
                    <AvatarFallback>{barber.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{barber.name}</CardTitle>
                    <CardDescription>{barber.email}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDeleteBarber(barber.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Phone: {barber.phone}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
