"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles, getDreamsForProfile } from "@/lib/apiClient";
import type { Dream, DreamProfile } from "@/app/types";
import {
  getTimePhase,
  getSeason,
  getSkyGradient,
  getCelestial,
  HAZE,
} from "@/lib/forestAtmosphere";
import {
  getGrowthLevel,
  nextLevelInfo,
  RECENT_FRUIT_COUNT,
  fruitColor,
  EMOTION_COLORS,
} from "@/lib/forest";
import { toast } from "@/lib/toast";
import ForestTree from "@/app/components/forest/ForestTree";
import PastDreamsList from "@/app/components/forest/PastDreamsList";
import ForestGuide from "@/app/components/forest/ForestGuide";
import SeasonalParticles from "@/app/components/forest/SeasonalParticles";
import FruitLegend from "@/app/components/forest/FruitLegend";
import ParticleField from "@/app/components/forest/ParticleField";

// ---- 実タップで開く夢プレビューモーダル -----------------------------------
function DreamPreviewModal({
  dream,
  profileColor,
  onClose,
}: {
  dream: Dream | null;
  profileColor: string;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  if (!dream) return null;
  const emos = dream.emotions ?? [];
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="w-[min(360px,90%)] rounded-[22px] p-5 text-white"
        style={{
          background: "linear-gradient(160deg, rgba(30,28,66,0.96), rgba(18,16,44,0.96))",
          border: `1px solid ${profileColor}55`,
          boxShadow: `0 24px 60px rgba(6,4,20,0.6), 0 0 0 1px ${profileColor}22`,
        }}
      >
        {/* 日付＋感情チップ */}
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 flex-none rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, #fff, ${fruitColor(dream, profileColor)})`,
              boxShadow: `0 0 8px ${fruitColor(dream, profileColor)}`,
            }}
          />
          <span className="text-xs text-white/50">{dream.created_at?.slice(0, 10)}</span>
          {emos[0] && (
            <span
              className="ml-auto rounded-full px-2.5 py-0.5 text-[12px] font-bold"
              style={{
                background: `${EMOTION_COLORS[emos[0].name] ?? profileColor}22`,
                color: EMOTION_COLORS[emos[0].name] ?? profileColor,
              }}
            >
              {emos[0].name}
            </span>
          )}
        </div>
        <h3 className="mb-2 text-[19px] font-black">{dream.title}</h3>
        {dream.content && (
          <p className="mb-4 text-[14px] leading-relaxed text-white/75">{dream.content}</p>
        )}
        <Link
          href={`/dream/${dream.id}`}
          className="mb-2 block w-full rounded-[12px] py-2.5 text-center text-[14px] font-black text-white"
          style={{ background: `linear-gradient(135deg, ${profileColor}, #7c3aed)` }}
        >
          くわしく 見る
        </Link>
        <button
          onClick={onClose}
          className="w-full rounded-[12px] bg-white/10 py-2 text-[13px] font-bold text-white/70"
        >
          とじる
        </button>
      </motion.div>
    </div>
  );
}

// ---- メインページ ---------------------------------------------------------
export default function ForestProfilePage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = Number(params.profileId);
  const reduceMotion = useReducedMotion();

  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<Dream | null>(null);

  const now = useMemo(() => new Date(), []);
  const phase = getTimePhase(now);
  const season = getSeason(now);
  const sky = getSkyGradient(phase);
  const cel = getCelestial(phase);
  const haze = HAZE[phase];

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allProfiles, profileDreams] = await Promise.all([
        getDreamProfiles(),
        getDreamsForProfile(profileId),
      ]);
      const found = allProfiles.find((p) => p.id === profileId && !p.archived);
      if (!found) {
        router.replace("/forest");
        return;
      }
      setProfile(found);
      setDreams(profileDreams);
    } catch {
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

  const lvl = getGrowthLevel(dreams.length);
  const nx = nextLevelInfo(dreams.length);
  const pastDreams = dreams.slice(RECENT_FRUIT_COUNT);
  const newDreamHref = `/dream/new?dream_profile_id=${profile.id}`;

  return (
    <div className="relative min-h-screen pb-24 text-white" style={{ background: sky }}>
      {/* アンビエント（自前で overflow-hidden するためルートは clip しない＝sticky維持） */}
      <ParticleField phase={phase} season={season} weather="firefly" starOpacity={cel.starOpacity} />
      <SeasonalParticles season={season} behind />

      {/* 月 */}
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-moon-pulse"
        style={{
          left: `${cel.moonXPct}%`,
          top: `${cel.moonYPct}%`,
          width: 70,
          height: 70,
          background: cel.glow,
          boxShadow: `0 0 56px 22px ${cel.glow}55`,
        }}
        aria-hidden="true"
      />

      {/* sticky ヘッダー */}
      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/forest" className="flex items-center text-white/80 hover:text-white">
            <ChevronLeft className="mr-1 h-5 w-5" /> もり
          </Link>
          <h1 className="ml-3 whitespace-nowrap text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の き
          </h1>
          <span
            className="ml-auto rounded-full px-3 py-1 text-[13px] font-black"
            style={{
              background: `${profile.color}22`,
              border: `1px solid ${profile.color}66`,
              color: profile.color,
            }}
          >
            {lvl.name}（{lvl.reading}）
          </span>
        </div>
      </header>

      {/* 実の色の凡例トグル */}
      <FruitLegend />

      {/* 地面の霞 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{ background: `linear-gradient(to top, ${haze}, transparent)` }}
        aria-hidden="true"
      />

      <main className="container relative z-[2] mx-auto max-w-3xl px-4 pt-10">
        {/* 大きな木 */}
        <div className="flex justify-center pb-6">
          {dreams.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
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
                href={newDreamHref}
                className="mt-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
              >
                ゆめを かく
              </Link>
            </div>
          ) : (
            <ForestTree
              profile={profile}
              dreams={dreams}
              level={lvl.level}
              height={380}
              variant="detail"
              usePhysics={true}
              showFruits
              onTapFruit={(d) => setPreview(d)}
            />
          )}
        </div>

        {/* 進捗バー */}
        {dreams.length > 0 && (
          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-black/30 px-4 py-3 backdrop-blur-lg">
            <span className="whitespace-nowrap text-[13px] font-black" style={{ color: profile.color }}>
              {lvl.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${nx.pct}%`, background: `linear-gradient(90deg, ${profile.color}, #fde68a)` }}
              />
            </div>
            <span className="whitespace-nowrap text-[12px] text-white/60">
              {nx.atMax ? "さいだいまで そだった！" : `あと ${nx.remaining}こ`}
            </span>
          </div>
        )}

        {/* 統計＋CTA */}
        <div className="mx-4 mb-6 flex gap-2">
          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-black/30 py-2 text-[13px] font-bold backdrop-blur-lg">
            <span>🌙</span>
            <span style={{ color: "#7dd3fc", fontWeight: 800 }}>{dreams.length}</span> ゆめ
          </div>
          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-black/30 py-2 text-[13px] font-bold backdrop-blur-lg">
            <span>🍎</span>
            <span style={{ color: "#fbbf24", fontWeight: 800 }}>
              {Math.min(dreams.length, RECENT_FRUIT_COUNT)}
            </span>{" "}
            みのり
          </div>
          <Link
            href={newDreamHref}
            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl py-2 text-[13.5px] font-black text-white shadow-[0_8px_20px_rgba(124,58,237,0.4)]"
            style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
          >
            ✎ ゆめを かく
          </Link>
        </div>

        {/* 昔の夢リスト */}
        <PastDreamsList dreams={pastDreams} />
      </main>

      {/* モルペウス案内人（吹き出し＋メダリオンを内包） */}
      <ForestGuide variant="tree" profile={profile} dreamCount={dreams.length} />

      {/* 実タップ時の夢プレビューモーダル */}
      <DreamPreviewModal dream={preview} profileColor={profile.color} onClose={() => setPreview(null)} />
    </div>
  );
}
