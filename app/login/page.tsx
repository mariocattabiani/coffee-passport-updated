import Link from "next/link";
import type { Metadata } from "next";

import { AuthShell } from "@/components/marketing/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in — Coffee Passport",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep building your coffee passport."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-espresso hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
