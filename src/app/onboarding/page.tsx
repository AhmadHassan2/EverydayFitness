import type { Metadata } from "next";
import { OnboardingScreen } from "@/components/settings/onboarding-screen";

export const metadata: Metadata = { title: "Set your goals" };

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
