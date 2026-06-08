"use client";

import { useTransition } from "react";
import { deleteUser } from "@/app/actions/admin";
import { Button } from "@/components/ui";

export function DeleteUserButton({
  userId,
  userLabel,
}: {
  userId: string;
  userLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        const first = window.confirm(
          `Delete ${userLabel}?\n\nThis will remove their account, team memberships, and vacation requests.`
        );
        if (!first) return;

        const second = window.confirm(
          `Are you absolutely sure you want to permanently delete ${userLabel}? This cannot be undone.`
        );
        if (!second) return;

        startTransition(async () => {
          await deleteUser(userId);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
