"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";
import { toast } from "@/lib/toast";
import { useRecentDream } from "@/hooks/useRecentDream";
import ForestScene from "@/app/components/forest/ForestScene";
import ForestGuide from "@/app/components/forest/ForestGuide";
import TreeSidePanel from "@/app/components/forest/TreeSidePanel";

export default function ForestPage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DreamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDreamProfiles();
      setProfiles(data.filter((p) => !p.archived)); // 森は active のみ
    } catch {
      toast.error("もりを よみこめませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") load();
    // router is intentionally excluded: Next's router is a stable singleton in
    // production, but re-including it here caused a runaway re-fetch loop in
    // tests where useRouter() is mocked to return a fresh object every render.
  }, [authStatus, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );
  const { recentDream, loading: recentDreamLoading } = useRecentDream(selectedProfileId);

  const totalDreams = profiles.reduce((s, p) => s + (p.dreams_count ?? 0), 0);
  const topProfile = profiles.reduce<DreamProfile | null>((top, p) => {
    if ((p.dreams_count ?? 0) === 0) return top;
    if (!top || (p.dreams_count ?? 0) > (top.dreams_count ?? 0)) return p;
    return top;
  }, null);

  const openProfile = useCallback((p: DreamProfile) => router.push(`/forest/${p.id}`), [router]);
  const openRoom = useCallback((p: DreamProfile) => router.push(`/room/${p.id}`), [router]);

  if (authStatus === "checking") return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-6 lg:max-w-6xl">
        <h1 className="text-xl font-bold">ゆめの もり</h1>
        <p className="text-sm text-muted-foreground">
          みんなの ゆめが きに なって そだっていくよ。きを タップしてみてね。
        </p>
        {isLoading ? (
          <div className="h-[70vh] animate-pulse rounded-3xl bg-muted" />
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-1">
              <ForestScene
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectTree={(p) => setSelectedProfileId(p.id)}
                onCloseSheet={() => setSelectedProfileId(null)}
                recentDream={recentDream}
                loading={recentDreamLoading}
              />
            </div>
            <TreeSidePanel
              profiles={profiles}
              selectedProfile={selectedProfile}
              recentDream={recentDream}
              loading={recentDreamLoading}
              totalDreams={totalDreams}
              topProfile={topProfile}
              onOpen={openProfile}
              onPeekRoom={openRoom}
              onClose={() => setSelectedProfileId(null)}
            />
          </div>
        )}
      </main>
      {!isLoading && <ForestGuide variant="forest" profiles={profiles} />}
    </div>
  );
}
