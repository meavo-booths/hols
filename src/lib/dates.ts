import { eachDayOfInterval, isWeekend } from "date-fns";
import type { RequestDuration } from "@/lib/days-format";

export function countWorkingDays(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d)).length;
}

export function calculateRequestDays(
  startDate: Date,
  endDate: Date,
  duration: RequestDuration
): { ok: true; days: number } | { ok: false; error: string } {
  if (duration === "half") {
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (!sameDay) {
      return { ok: false, error: "Half day requests must use a single date." };
    }
    if (isWeekend(startDate)) {
      return { ok: false, error: "Half day must fall on a working day." };
    }
    return { ok: true, days: 0.5 };
  }

  if (endDate < startDate) {
    return { ok: false, error: "End date must be on or after start date." };
  }

  const days = countWorkingDays(startDate, endDate);
  if (days < 1) {
    return { ok: false, error: "Request must include at least one working day." };
  }

  return { ok: true, days };
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
