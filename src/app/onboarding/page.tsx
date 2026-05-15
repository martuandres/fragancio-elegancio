import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role) redirect("/dashboard");

  return <OnboardingClient />;
}
