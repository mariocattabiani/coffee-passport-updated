"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/marketing/google-icon";
import { signIn, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in..." : "Log in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <>
      <form action={formAction} className="space-y-5">
        {state?.error && (
          <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs font-medium text-espresso/70 hover:text-espresso hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
        </div>

        <SubmitButton />
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-charcoal/40">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" className="w-full gap-3" disabled>
        <GoogleIcon />
        Continue with Google (coming soon)
      </Button>
    </>
  );
}
