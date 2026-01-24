"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { type Barber } from "@/drizzle/schema";
import { updateBarber } from "@/server/actions/barbers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditEmployeeDialogProps {
  employee: Barber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (employee: Barber) => void;
}

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  onSave,
}: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    imageUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || "",
        imageUrl: employee.imageUrl || "",
      });
    }
  }, [employee]);

  const handleSubmit = async () => {
    if (!employee) return;

    setIsSubmitting(true);
    try {
      const result = await updateBarber({
        id: employee.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        imageUrl: formData.imageUrl || null,
      });

      if (result.success) {
        toast.success("Employee updated successfully");
        onOpenChange(false);
        if (onSave && result.barber) {
          onSave(result.barber);
        }
      } else {
        toast.error(result.error || "Failed to update employee");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update employee information</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">Profile Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
