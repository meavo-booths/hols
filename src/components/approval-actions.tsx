"use client";

import { useState, useTransition } from "react";
import { reviewVacationRequest } from "@/app/actions/vacation";
import { Button } from "@/components/ui";

export function ApprovalActions({ requestId }: { requestId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          Approve
        </Button>
        <Button
          className="w-full sm:w-auto"
          variant="danger"
          disabled={pending}
          onClick={() => {
            const note = window.prompt("Rejection reason (optional):") ?? undefined;
            setError(null);
            startTransition(async () => {
              const result = await reviewVacationRequest(requestId, "reject", note);
              if (result.error) setError(result.error);
            });
          }}
        >
          Reject
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
