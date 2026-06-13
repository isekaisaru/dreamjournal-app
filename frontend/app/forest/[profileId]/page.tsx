"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles, getDreamsForProfile } from "@/lib/apiClient";
import type { Dream, DreamProfile } from "@/app/types";
import { RECENT_FRUIT_COUNT } from "@/lib/forest";
import { toast } from "@/lib/toast";
import DreamTree from "@/app/components/forest/DreamTree";
import PastDreamsList from "@/app/components/forest/PastDreamsList";
import ForestGuide from "@/app/components/forest/ForestGuide";

export default function ForestProfilePage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = Number(params.profileId);

  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allProfiles, profileDreams] = await Promise.all([
        getDreamProfiles(),
        getDreamsForProfile(profileId),
      ]);
      const found = allProfiles.find((p) => p.id === profileId && !p.archived);
      if (!found) {
        router.replace("/forest"); // 他人/存在しない/アーカイブ済みは森へ
        return;
      }
      setProfile(found);
      setDreams(profileDreams);
    } catch {
      // 取得失敗時は空白画面に落とさず、森へ退避する
      toast.error("きを よみこめませんでした。");
      router.replace("/forest");
    } finally {
      setIsLoading(false);
    }
  }, [profileId, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
  }, [authStatus, load, router]);

  if (authStatus === "checking" || isLoading) return <Loading />;
  if (!profile) return null;

  const pastDreams = dreams.slice(RECENT_FRUIT_COUNT);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#241a40] via-[#1a1336] to-[#0e0a1c] pb-24 text-white">
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/forest" className="flex items-center text-white/80 hover:text-white">
            <ChevronLeft className="mr-1 h-5 w-5" /> もり
          </Link>
          <h1 className="ml-3 text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の き
          </h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 pt-10">
        {dreams.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <motion.span
              className="text-6xl"
              animate={reduceMotion ? undefined : { y: [-4, 4, -4], scale: [1, 1.04, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            >
              🌱
            </motion.span>
            <p className="text-lg font-bold text-white/90">まだ みが ないね</p>
            <p className="text-sm leading-relaxed text-white/60">
              ゆめを かいて、さいしょの みを ならせよう。
            </p>
            <Link
              href={`/dream/new?dream_profile_id=${profile.id}`}
              className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
            >
              ゆめを かく
            </Link>
          </div>
        ) : (
          <DreamTree profile={profile} dreams={dreams} />
        )}
        <PastDreamsList dreams={pastDreams} />
      </main>

      <ForestGuide variant="tree" profile={profile} dreamCount={dreams.length} />
    </div>
  );
}
