import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="w-full">
      <Card className="mx-auto w-full max-w-md text-center">
        <div className="flex flex-col items-center">
          <Image
            src="/meavo-logo.png"
            alt="Meavo"
            width={96}
            height={48}
            className="h-12 w-auto object-contain"
            priority
          />
          <p className="mt-3 text-lg font-semibold text-slate-900">Vacation Tracker</p>
        </div>
        <p className="mt-4 text-slate-600">
          Sign in with your email and password to view the team calendar and manage time off.
        </p>
        <LoginForm />
      </Card>
    </div>
  );
}
