"use client";

import { useTransition } from "react";
import { managerRevokeVacationRequest } from "@/app/actions/vacation";
import { Button } from "@/components/ui";

export function RevokeRequestButton({
  requestId,
  userLabel,
  status,
}: {
  requestId: string;
  userLabel: string;
  status: "APPROVED" | "REJECTED";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() => {
        const message =
          status === "APPROVED"
            ? `Cancel ${userLabel}'s approved time off?\n\nThis removes it from the calendar and restores their allowance.`
            : `Remove ${userLabel}'s rejected request from the history?`;

        if (!window.confirm(message)) return;

        startTransition(async () => {
          await managerRevokeVacationRequest(requestId);
        });
      }}
    >
      {pending ? "Cancelling…" : "Cancel request"}
    </Button>
  );
}
