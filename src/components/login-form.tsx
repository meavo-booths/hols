"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="mt-8 space-y-4 text-left">
      <Input label="Email" name="email" type="email" required autoComplete="email" />
      <Input
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
