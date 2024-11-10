"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { addBarber } from "../_actions/addbarber";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useActionState, useState } from "react";

const initialState = {
  errors: {
    name: undefined,
    email: undefined,
    phone: undefined,
    imageUrl: undefined,
  },
  success: undefined,
  barber: undefined,
};

export default function ClientDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addBarber, initialState);
  // TODO: add form validation
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Barber
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add New Barber</DialogTitle>
            <DialogDescription>Add a new barber to your team</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">Profile Image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => setOpen(false)}>
              Add Barber
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
