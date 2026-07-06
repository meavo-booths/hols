"use client";

import { useState } from "react";
import { cancelVacationRequest } from "@/app/actions/vacation";
import { VacationRequestForm, type VacationRequestFormValues } from "@/components/request-form";
import { Button } from "@/components/ui";

export function PendingRequestActions({
  requestId,
  initialValues,
}: {
  requestId: string;
  initialValues: VacationRequestFormValues;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="w-full sm:max-w-xl">
        <VacationRequestForm
          mode="edit"
          requestId={requestId}
          initialValues={initialValues}
          showCard={false}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <form action={cancelVacationRequest.bind(null, requestId)}>
        <Button type="submit" variant="secondary">
          Cancel request
        </Button>
      </form>
    </div>
  );
}
