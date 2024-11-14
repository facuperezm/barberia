import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentWeekDays() {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = today.getDate() - currentDay;

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.setDate(diff + index));
    return {
      date: day,
      dayName: day.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: day.getDate(),
    };
  });
}
