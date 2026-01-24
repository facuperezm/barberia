"use client";

import { useEffect, useActionState, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { type Barber } from "@/drizzle/schema";
import { addBarber, updateBarber } from "@/server/actions/barbers";

interface TeamMemberDialogProps {
  mode: "add" | "edit" | null;
  member: Barber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = {
  success: false,
  error: "",
  barber: undefined,
};

export function TeamMemberDialog({
  mode,
  member,
  open,
  onOpenChange,
}: TeamMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    imageUrl: "",
    bio: "",
    isActive: true,
  });

  const [, formAction] = useActionState(addBarber, initialState);

  useEffect(() => {
    if (member && mode === "edit") {
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        imageUrl: member.imageUrl || "",
        bio: member.bio || "",
        isActive: member.isActive,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        imageUrl: "",
        bio: "",
        isActive: true,
      });
    }
  }, [member, mode, open]);

  const handleSubmitEdit = async () => {
    if (!member) return;

    setIsSubmitting(true);
    try {
      const result = await updateBarber({
        id: member.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        imageUrl: formData.imageUrl || null,
        bio: formData.bio || null,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Team member updated successfully");
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update team member");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubmit = () => {
    toast.success("Team member added successfully");
    onOpenChange(false);
  };

  if (!open) return null;

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit Team Member" : "Add New Team Member";
  const description = isEdit
    ? "Update team member information"
    : "Add a new member to your team";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSubmitting}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={isSubmitting}
                placeholder="john@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={isSubmitting}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-imageUrl">Profile Image URL</Label>
              <Input
                id="edit-imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                disabled={isSubmitting}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                disabled={isSubmitting}
                placeholder="A short bio about this team member..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Active</Label>
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                disabled={isSubmitting}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={isSubmitting}>
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
          </div>
        ) : (
          <form action={formAction}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="add-name">Full Name</Label>
                <Input
                  id="add-name"
                  name="name"
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  name="email"
                  type="email"
                  required
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-imageUrl">Profile Image URL</Label>
                <Input
                  id="add-imageUrl"
                  name="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" onClick={handleAddSubmit}>
                Add Team Member
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
