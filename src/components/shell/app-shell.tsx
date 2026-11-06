"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/data/hooks";
import { RepositoryError } from "@/lib/data/repository";
import { AppUIProvider } from "./app-ui";
import { BottomNav, SideNav } from "./nav";
import { FoodSheet } from "@/components/food/food-sheet";
import { WorkoutSheet } from "@/components/workout/workout-sheet";
import { MealBuilderSheet } from "@/components/food/meal-builder-sheet";

/** Sends new users to onboarding and expired sessions to sign-in. */
function Gates() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useProfile();
  useEffect(() => {
    if (profile.error instanceof RepositoryError && profile.error.code === "unauthorized") {
      window.location.assign("/login");
      return;
    }
    if (profile.data && !profile.data.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
  }, [profile.data, profile.error, pathname, router]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppUIProvider>
      <Gates />
      <div className="flex min-h-dvh">
        <SideNav />
        <main className="mx-auto w-full min-w-0 max-w-[640px] px-4 pb-[calc(88px+env(safe-area-inset-bottom))] md:max-w-[1180px] md:px-8 md:pb-12 lg:px-10">
          {children}
        </main>
      </div>
      <BottomNav />
      <FoodSheet />
      <WorkoutSheet />
      <MealBuilderSheet />
    </AppUIProvider>
  );
}
