"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DEFAULT_GOALS } from "@/lib/domain/goals";
import { deviceTimeZone, todayIn } from "@/lib/domain/dates";
import { useSetGoals, useUpdateProfile } from "@/lib/data/hooks";
import { useRepository } from "@/lib/data/provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalsForm } from "./goals-form";

export function OnboardingScreen() {
  const router = useRouter();
  const repo = useRepository();
  const setGoals = useSetGoals();
  const updateProfile = useUpdateProfile();
  const pending = setGoals.isPending || updateProfile.isPending;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-[max(24px,env(safe-area-inset-top))]">
      <div className="px-1">
        <span aria-hidden className="mb-5 block size-6 rounded-full border-[3.5px] border-accent" />
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Set your daily goals</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          These are starting values. Adjust them to your plan. You can change them any time in Settings.
        </p>
      </div>
      <Card className="p-4">
        {repo ? (
          <GoalsForm
            initial={DEFAULT_GOALS}
            submitLabel={pending ? "Saving…" : "Start tracking"}
            pending={pending}
            onSubmit={async (g) => {
              const tz = deviceTimeZone();
              try {
                await updateProfile.mutateAsync({ timezone: tz });
                await setGoals.mutateAsync({ goals: g, effectiveDate: todayIn(tz) });
                await updateProfile.mutateAsync({ onboarded: true });
                router.replace("/");
              } catch (e) {
                toast.error("Couldn't save your goals", { description: (e as Error).message });
              }
            }}
          />
        ) : (
          <Skeleton className="h-64" />
        )}
      </Card>
      {repo ? (
        <p className="px-1 text-[13px] text-muted-foreground">Your day resets at midnight in {deviceTimeZone()}.</p>
      ) : null}
    </main>
  );
}
