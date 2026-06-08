import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full">
      <Card className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Vacation Tracker</h1>
        <p className="mt-2 text-slate-600">
          Sign in with your email and password to view the team calendar and manage time off.
        </p>
        <LoginForm />
      </Card>
    </div>
  );
}
