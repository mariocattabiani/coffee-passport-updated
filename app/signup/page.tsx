import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/marketing/auth-shell";
import { GoogleIcon } from "@/components/marketing/google-icon";

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
      <form className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" type="text" placeholder="Jamie Rivera" autoComplete="name" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" />
        </div>

        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-charcoal/40">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" className="w-full gap-3">
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-xs text-charcoal/40">
        By creating an account you agree to Coffee Passport's Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}
