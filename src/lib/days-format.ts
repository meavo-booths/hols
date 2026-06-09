export type RequestDuration = "full" | "half";

export function formatDayCount(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

export function formatDayLabel(days: number): string {
  if (days === 0.5) return "half working day";
  if (days === 1) return "1 working day";
  return `${formatDayCount(days)} working days`;
}

export function inferRequestDuration(
  startDate: Date,
  endDate: Date,
  days: number
): RequestDuration {
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (days === 0.5 && sameDay) return "half";
  return "full";
}
