"use client";

import { useState, useTransition } from "react";
import { createVacationRequest } from "@/app/actions/vacation";
import type { RequestDuration } from "@/lib/days-format";
import { Button, Card, Input } from "@/components/ui";

export function RequestForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState<RequestDuration>("full");

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Request time off</h2>
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(formData) => {
          setError(null);
          setSuccess(false);
          startTransition(async () => {
            const result = await createVacationRequest(formData);
            if (result.error) {
              setError(result.error);
            } else {
              setSuccess(true);
              (document.getElementById("request-form") as HTMLFormElement)?.reset();
              setDuration("full");
            }
          });
        }}
        id="request-form"
      >
        <label className="block space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Duration</span>
          <select
            name="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value as RequestDuration)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="full">Full day(s)</option>
            <option value="half">Half day</option>
          </select>
        </label>

        <Input
          label={duration === "half" ? "Date" : "Start date"}
          name="startDate"
          type="date"
          required
        />

        {duration === "full" && <Input label="End date" name="endDate" type="date" required />}

        <div className="sm:col-span-2">
          <Input label="Note (optional)" name="note" placeholder="e.g. family trip" />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        {success && (
          <p className="text-sm text-emerald-600 sm:col-span-2">
            Request submitted for manager approval.
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </form>
      <p className="mt-3 text-xs text-slate-500">
        {duration === "half"
          ? "Half day uses 0.5 days from your allowance. Weekends cannot be selected."
          : "Weekends are excluded from the day count. Your manager will be notified to approve or reject."}
      </p>
    </Card>
  );
}
