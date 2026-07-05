"use client";

import { useState, useTransition } from "react";
import { reviewVacationRequest } from "@/app/actions/vacation";
import { Button } from "@/components/ui";

export function ApprovalActions({ requestId }: { requestId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (rejecting) {
    return (
      <form
        className="w-full space-y-2 sm:w-auto"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await reviewVacationRequest(
              requestId,
              "reject",
              note.trim() || undefined
            );
            if (result.error) setError(result.error);
          });
        }}
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Rejection reason (optional)</span>
          <input
            autoFocus
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            placeholder="Let them know why…"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="danger" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Rejecting…" : "Confirm rejection"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() => {
              setRejecting(false);
              setNote("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await reviewVacationRequest(requestId, "approve");
              if (result.error) setError(result.error);
            });
          }}
        >
          {pending ? "Approving…" : "Approve"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="danger"
          disabled={pending}
          onClick={() => setRejecting(true)}
        >
          Reject
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
