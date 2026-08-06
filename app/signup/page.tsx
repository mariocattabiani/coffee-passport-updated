import Link from "next/link";
import type { Metadata } from "next";

import { AuthShell } from "@/components/marketing/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account — Coffee Passport",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your passport"
      subtitle="Start logging the coffee you drink and the shops you love."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-espresso hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
