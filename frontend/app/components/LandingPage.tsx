"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MorpheusGuideLanding } from "./MorpheusGuide";
import LandingHero from "./landing/LandingHero";
import LandingProductProof from "./landing/LandingProductProof";
import LandingFeatureGrid from "./landing/LandingFeatureGrid";
import LandingFinalCta from "./landing/LandingFinalCta";
import LandingFaq from "./landing/LandingFaq";
import LandingTechStack from "./landing/LandingTechStack";

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    }
  }, [authStatus, router]);

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
      </div>
    );
  }

  if (authStatus === "authenticated") return null;

  return (
    <div className="relative isolate overflow-hidden">
      <LandingHero />
      <LandingProductProof />
      <LandingFeatureGrid />
      <LandingFinalCta />
      <LandingFaq />
      <LandingTechStack />
      <MorpheusGuideLanding />
    </div>
  );
}
