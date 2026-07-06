"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVacationRequest, updateVacationRequest } from "@/app/actions/vacation";
import type { RequestDuration } from "@/lib/days-format";
import { Button, Card, Input } from "@/components/ui";

export type VacationRequestFormValues = {
  duration: RequestDuration;
  startDate: string;
  endDate: string;
  note: string | null;
};

type VacationRequestFormProps = {
  mode?: "create" | "edit";
  requestId?: string;
  initialValues?: VacationRequestFormValues;
  onCancel?: () => void;
  onSaved?: () => void;
  showCard?: boolean;
  formId?: string;
};

export function VacationRequestForm({
  mode = "create",
  requestId,
  initialValues,
  onCancel,
  onSaved,
  showCard = true,
  formId,
}: VacationRequestFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState<RequestDuration>(initialValues?.duration ?? "full");
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [note, setNote] = useState(initialValues?.note ?? "");

  const resolvedFormId = formId ?? (isEdit ? `edit-request-form-${requestId}` : "request-form");

  const form = (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={(formData) => {
        setError(null);
        setSuccess(false);
        if (duration === "full" && startDate && endDate && endDate < startDate) {
          setError("End date must be on or after the start date.");
          return;
        }
        startTransition(async () => {
          const result = isEdit
            ? await updateVacationRequest(requestId!, formData)
            : await createVacationRequest(formData);
          if (result.error) {
            setError(result.error);
          } else {
            setSuccess(true);
            if (isEdit) {
              onSaved?.();
            } else {
              (document.getElementById(resolvedFormId) as HTMLFormElement)?.reset();
              setDuration("full");
              setStartDate("");
              setEndDate("");
              setNote("");
            }
            router.refresh();
          }
        });
      }}
      id={resolvedFormId}
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
        value={startDate}
        onChange={(value) => {
          setStartDate(value);
          if (endDate && value && endDate < value) setEndDate(value);
        }}
        required
      />

      {duration === "full" && (
        <Input
          label="End date"
          name="endDate"
          type="date"
          value={endDate}
          onChange={setEndDate}
          min={startDate || undefined}
          required
        />
      )}

      <div className="sm:col-span-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Note (optional)</span>
          <input
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. family trip"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-600 sm:col-span-2">
          {isEdit ? "Request updated." : "Request submitted for manager approval."}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
        <Button type="submit" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving…"
              : "Submitting…"
            : isEdit
              ? "Save changes"
              : "Submit request"}
        </Button>
        {isEdit && onCancel && (
          <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  const footer = (
    <p className="mt-3 text-xs text-slate-500">
      {duration === "half"
        ? "Half day uses 0.5 days from your allowance. Weekends cannot be selected."
        : "Weekends are excluded from the day count. Your manager will be notified to approve or reject."}
    </p>
  );

  if (!showCard) {
    return (
      <div>
        {form}
        {!isEdit && footer}
      </div>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {isEdit ? "Edit request" : "Request time off"}
      </h2>
      {form}
      {footer}
    </Card>
  );
}

export function RequestForm() {
  return <VacationRequestForm mode="create" />;
}
