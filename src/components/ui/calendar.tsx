"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col gap-4 place-self-center sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "relative flex h-7 items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-1 top-0 flex h-7 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-8 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        // `day` is the <td> gridcell. v9 sets data-selected/today/outside/disabled
        // here (not on the button), so we style the child button via those flags.
        day: cn(
          "relative size-8 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&[data-selected=true]>button]:bg-primary [&[data-selected=true]>button]:text-primary-foreground",
          "[&[data-selected=true]>button:hover]:bg-primary [&[data-selected=true]>button:hover]:text-primary-foreground",
          "[&[data-today=true]:not([data-selected=true])>button]:bg-accent [&[data-today=true]:not([data-selected=true])>button]:text-accent-foreground",
          "[&[data-outside=true]>button]:text-muted-foreground [&[data-outside=true]>button]:opacity-50",
          "[&[data-disabled=true]>button]:text-muted-foreground [&[data-disabled=true]>button]:opacity-50",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 rounded-md p-0 font-normal",
        ),
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({
          orientation,
          className: chevronClassName,
        }: {
          orientation?: "up" | "down" | "left" | "right";
          className?: string;
        }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", chevronClassName)} />
          ) : (
            <ChevronRightIcon className={cn("size-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
