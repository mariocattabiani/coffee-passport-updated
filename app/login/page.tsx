import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/marketing/auth-shell";
import { GoogleIcon } from "@/components/marketing/google-icon";

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
      <form className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs font-medium text-espresso/70 hover:text-espresso hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        </div>

        <Button type="submit" className="w-full">
          Log in
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
    </AuthShell>
  );
}
