"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DefaultSchedule } from "@/app/(dashboard)/dashboard/schedule/_components/default-schedule";
import { ScheduleOverrides } from "@/app/(dashboard)/dashboard/schedule/_components/schedule-overrides";
import { Button } from "@/components/ui/button";

export function ManageScheduleDialog() {
  const [activeTab, setActiveTab] = useState("default");
  const [isManageScheduleOpen, setIsManageScheduleOpen] = useState(false);

  return (
    <Dialog open={isManageScheduleOpen} onOpenChange={setIsManageScheduleOpen}>
      <DialogTrigger asChild>
        <Button>Manage Working Hours</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Working Hours</DialogTitle>
          <DialogDescription>
            Set default working hours and manage schedule exceptions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="default">Default Schedule</TabsTrigger>
            <TabsTrigger value="overrides">Schedule Exceptions</TabsTrigger>
          </TabsList>
          <TabsContent value="default">
            <DefaultSchedule />
          </TabsContent>
          <TabsContent value="overrides">
            <ScheduleOverrides />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
