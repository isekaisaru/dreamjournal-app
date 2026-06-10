"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loading from "@/app/loading";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";
import { toast } from "@/lib/toast";
import ForestScene from "@/app/components/forest/ForestScene";
import ForestGuide from "@/app/components/forest/ForestGuide";

export default function ForestPage() {
  const { authStatus } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DreamProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [authStatus, load, router]);

  if (authStatus === "checking") return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-xl font-bold">ゆめの もり</h1>
        <p className="text-sm text-muted-foreground">
          みんなの ゆめが きに なって そだっていくよ。きを タップしてみてね。
        </p>
        {isLoading ? (
          <div className="h-[70vh] animate-pulse rounded-3xl bg-muted" />
        ) : (
          <ForestScene profiles={profiles} />
        )}
      </main>
      {!isLoading && <ForestGuide variant="forest" profiles={profiles} />}
    </div>
  );
}
