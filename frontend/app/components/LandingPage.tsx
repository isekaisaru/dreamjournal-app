"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MorpheusGuideLanding } from "./MorpheusGuide";
import LandingHero from "./landing/LandingHero";
import LandingProductProof from "./landing/LandingProductProof";
import LandingFeatureGrid from "./landing/LandingFeatureGrid";
import LandingFinalCta from "./landing/LandingFinalCta";
import LandingFaq from "./landing/LandingFaq";
import LandingTechStack from "./landing/LandingTechStack";

// 前にログインした人（認証ヒントあり）は、トップでもサーバーにログイン状態を確認する。
// サーバー（Render）が寝ていると確認に20秒以上かかるため、少し待っても終わらなければ
// 紹介を先に見せる。確認が終わってログイン済みと分かれば、下の useEffect で /home へ移る。
// すぐ終わる場合は、ログイン済みの人に紹介が一瞬だけ見えないよう、点の表示のまま待つ。
export const SHOW_LANDING_WHILE_CHECKING_AFTER_MS = 1500;

export default function LandingPage() {
  const router = useRouter();
  const { authStatus } = useAuth();
  const [isCheckingSlow, setIsCheckingSlow] = useState(false);

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "checking") return;
    const timer = setTimeout(
      () => setIsCheckingSlow(true),
      SHOW_LANDING_WHILE_CHECKING_AFTER_MS
    );
    return () => clearTimeout(timer);
  }, [authStatus]);

  if (authStatus === "checking" && !isCheckingSlow) {
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
