"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import {
  clearLoginThrottle,
  isLoginThrottled,
  recordLoginFailure,
  THROTTLE_ERROR,
} from "@/lib/login-throttle";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

type LoginState = { error?: string; ok?: boolean } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const throttleKey = `hols-login:${email}`;
  if (await isLoginThrottled(throttleKey)) {
    return { error: THROTTLE_ERROR };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      await recordLoginFailure(throttleKey);
      return { error: "Invalid email or password." };
    }

    await clearLoginThrottle(throttleKey);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      await recordLoginFailure(throttleKey);
      return { error: "Invalid email or password." };
    }
    console.error("Login failed:", error);
    return { error: "Something went wrong. Check that the database is set up." };
  }
}
