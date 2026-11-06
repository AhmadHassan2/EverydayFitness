"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { enterDemo } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string(),
});
type Values = z.infer<typeof schema>;

type Mode = "signin" | "signup";

function callbackUrl() {
  return `${siteUrl || window.location.origin}/auth/callback`;
}

export function LoginScreen() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-sm content-center gap-6 px-4 py-[max(24px,env(safe-area-inset-top))]">
      <div className="px-1">
        <span aria-hidden className="mb-5 block size-6 rounded-full border-[3.5px] border-accent" />
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Everyday</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Calories, macros and training, logged in seconds.</p>
      </div>
      {isSupabaseConfigured ? <AuthForm /> : <NotConfigured />}
      <div className="grid gap-2 px-1 text-center">
        <Button variant="ghost" onClick={enterDemo}>
          Explore the demo
        </Button>
        <p className="text-xs text-muted-foreground">Sample data, saved only on this device.</p>
      </div>
    </main>
  );
}

function NotConfigured() {
  return (
    <Card className="p-4">
      <p className="text-[15px] font-medium">Accounts aren&apos;t set up yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your Supabase URL and anon key to <code className="font-mono text-[13px]">.env.local</code> to enable sign-in. Until
        then the app runs in demo mode.
      </p>
    </Card>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [status, setStatus] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState, getValues, trigger } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const submit = async ({ email, password }: Values) => {
    if (password.length < 8) {
      setStatus({ kind: "error", text: "Use at least 8 characters for your password." });
      return;
    }
    setBusy(true);
    setStatus(null);
    const sb = getBrowserSupabase();
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/");
      } else {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callbackUrl() } });
        if (error) throw error;
        if (data.session) window.location.assign("/onboarding");
        else setStatus({ kind: "info", text: `Check ${email} for a link to confirm your account.` });
      }
    } catch (e) {
      setStatus({ kind: "error", text: friendlyError((e as Error).message) });
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    if (!(await trigger("email"))) return;
    setBusy(true);
    setStatus(null);
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email: getValues("email"),
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    setStatus(
      error
        ? { kind: "error", text: friendlyError(error.message) }
        : { kind: "info", text: `We sent a sign-in link to ${getValues("email")}.` },
    );
  };

  return (
    <Card className="p-4">
      <Segmented<Mode>
        label="Account"
        value={mode}
        onValueChange={(m) => {
          setMode(m);
          setStatus(null);
        }}
        options={[
          { value: "signin", label: "Sign in" },
          { value: "signup", label: "Create account" },
        ]}
      />
      <form onSubmit={handleSubmit(submit)} noValidate className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" {...register("email")} aria-invalid={Boolean(formState.errors.email) || undefined} />
          <FieldError>{formState.errors.email?.message}</FieldError>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            {...register("password")}
          />
        </div>
        {status ? (
          <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {status.text}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={magicLink}>
          <Mail aria-hidden /> Email me a sign-in link
        </Button>
      </form>
    </Card>
  );
}

function friendlyError(message: string): string {
  if (/invalid login/i.test(message)) return "That email and password don't match. Try again or use a sign-in link.";
  if (/already registered/i.test(message)) return "An account with this email already exists. Sign in instead.";
  if (/rate limit/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/fetch|network/i.test(message)) return "Couldn't reach the server. Check your connection.";
  return message;
}
