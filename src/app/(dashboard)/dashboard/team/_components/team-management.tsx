"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  CalendarClock,
  Plus,
  Loader2,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { type Barber } from "@/drizzle/schema";
import {
  getBarbers,
  deleteBarberWithResponse,
} from "@/server/actions/barbers";
import { TeamMemberDialog } from "./team-member-dialog";
import { ScheduleDialog } from "./schedule-dialog";
import { ScheduleOverrideDialog } from "./schedule-override-dialog";

interface TeamManagementProps {
  initialBarbers: Barber[];
}

export function TeamManagement({ initialBarbers }: TeamManagementProps) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Barber | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: barbers = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => getBarbers(),
    initialData: initialBarbers,
  });

  const handleOpenAdd = () => {
    setSelectedMember(null);
    setDialogMode("add");
  };

  const handleOpenEdit = (member: Barber) => {
    setSelectedMember(member);
    setDialogMode("edit");
  };

  const handleOpenSchedule = (member: Barber) => {
    setSelectedMember(member);
    setScheduleDialogOpen(true);
  };

  const handleOpenOverride = (member: Barber) => {
    setSelectedMember(member);
    setOverrideDialogOpen(true);
  };

  const handleOpenDelete = (member: Barber) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("id", String(selectedMember.id));
      const result = await deleteBarberWithResponse(formData);

      if (result.success) {
        toast.success("Team member deleted successfully");
        queryClient.invalidateQueries({ queryKey: ["team-members"] });
      } else {
        toast.error(result.error || "Failed to delete team member");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedMember(null);
    }
  };

  const handleDialogClose = () => {
    setDialogMode(null);
    setSelectedMember(null);
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {barbers.length} team member{barbers.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 size-4" />
            Add Team Member
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {barbers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No team members yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your first team member to get started
              </p>
              <Button className="mt-4" onClick={handleOpenAdd}>
                <Plus className="mr-2 size-4" />
                Add Team Member
              </Button>
            </div>
          ) : (
            barbers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="size-12">
                    <AvatarImage src={member.imageUrl ?? undefined} alt={member.name} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <Badge
                        variant={member.isActive ? "default" : "secondary"}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {member.email}
                    </span>
                    {member.phone && (
                      <span className="text-sm text-muted-foreground">
                        {member.phone}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(member)}>
                      <Pencil className="mr-2 size-4" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenSchedule(member)}>
                      <Calendar className="mr-2 size-4" />
                      Weekly Schedule
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenOverride(member)}>
                      <CalendarClock className="mr-2 size-4" />
                      Schedule Exceptions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleOpenDelete(member)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <TeamMemberDialog
        mode={dialogMode}
        member={selectedMember}
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
      />

      {/* Schedule Dialog */}
      <ScheduleDialog
        member={selectedMember}
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) setSelectedMember(null);
        }}
      />

      {/* Schedule Override Dialog */}
      <ScheduleOverrideDialog
        member={selectedMember}
        open={overrideDialogOpen}
        onOpenChange={(open) => {
          setOverrideDialogOpen(open);
          if (!open) setSelectedMember(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedMember?.name} and all their
              schedule data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
