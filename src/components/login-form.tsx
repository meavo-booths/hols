"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Button, Input } from "@/components/ui";

export function LoginForm({
  googleEnabled,
  authError,
}: {
  googleEnabled: boolean;
  authError?: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  const error = state?.error ?? authError;

  return (
    <div className="mt-8 space-y-4 text-left">
      {googleEnabled && (
        <>
          <GoogleSignInButton />
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">or</span>
            </div>
          </div>
        </>
      )}

      <form action={action} className="space-y-4">
        <Input label="Email" name="email" type="email" required autoComplete="email" />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in with password"}
        </Button>
      </form>
    </div>
  );
}
