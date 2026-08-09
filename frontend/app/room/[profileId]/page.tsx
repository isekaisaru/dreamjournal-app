"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Loading from "@/app/loading";
import type { Dream, DreamProfile } from "@/app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient, {
  getDreamProfiles,
  getDreamsForProfile,
} from "@/lib/apiClient";

const MAX_FRAMES = 6;

type Frame = {
  dream: Dream;
  status: "loading" | "loaded" | "error";
  imageUrl?: string;
};

function selectFrameDreams(dreams: Dream[]): Dream[] {
  return dreams
    .filter((dream): dream is Dream & { image_generated_at: string } =>
      Boolean(dream.image_generated_at)
    )
    .sort((a, b) => {
      const timeDifference =
        new Date(b.image_generated_at).getTime() -
        new Date(a.image_generated_at).getTime();
      return timeDifference || b.id - a.id;
    })
    .slice(0, MAX_FRAMES);
}

export default function DreamRoomPage() {
  const { authStatus } = useAuth();
  const params = useParams();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const rawProfileId = params.profileId;
  const profileId = Number(rawProfileId);

  const [profile, setProfile] = useState<DreamProfile | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const frameAbortRef = useRef<AbortController | null>(null);

  const loadRoom = useCallback(async () => {
    if (!Number.isInteger(profileId) || profileId <= 0) {
      router.replace("/forest");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [profiles, profileDreams] = await Promise.all([
        getDreamProfiles(),
        getDreamsForProfile(profileId),
      ]);
      const selectedProfile = Array.isArray(profiles)
        ? profiles.find((candidate) =>
            candidate.id === profileId && !candidate.archived
          )
        : null;

      if (!selectedProfile || !Array.isArray(profileDreams)) {
        router.replace("/forest");
        return;
      }

      setProfile(selectedProfile);
      setDreams(profileDreams);
    } catch (error) {
      console.error("Failed to load dream room", error);
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
    if (authStatus === "authenticated") void loadRoom();
  }, [authStatus, loadRoom, router]);

  const frameDreams = useMemo(() => selectFrameDreams(dreams), [dreams]);

  const fetchFrame = useCallback(async (dream: Dream, signal: AbortSignal) => {
    try {
      const detail = await apiClient.get<Dream>(`/dreams/${dream.id}`, { signal });
      if (signal.aborted) return;

      setFrames((current) =>
        current.map((frame) =>
          frame.dream.id === dream.id
            ? detail.generated_image_url
              ? { ...frame, status: "loaded", imageUrl: detail.generated_image_url }
              : { ...frame, status: "error", imageUrl: undefined }
            : frame
        )
      );
    } catch (error) {
      if (signal.aborted || (error as Error)?.name === "AbortError") return;
      setFrames((current) =>
        current.map((frame) =>
          frame.dream.id === dream.id
            ? { ...frame, status: "error", imageUrl: undefined }
            : frame
        )
      );
    }
  }, []);

  useEffect(() => {
    if (frameDreams.length === 0) {
      setFrames([]);
      return;
    }

    const controller = new AbortController();
    frameAbortRef.current = controller;
    setFrames(frameDreams.map((dream) => ({ dream, status: "loading" })));

    void (async () => {
      for (const dream of frameDreams) {
        if (controller.signal.aborted) return;
        await fetchFrame(dream, controller.signal);
      }
    })();

    return () => {
      controller.abort();
      if (frameAbortRef.current === controller) frameAbortRef.current = null;
    };
  }, [fetchFrame, frameDreams]);

  const retryFrame = useCallback(
    (dream: Dream) => {
      const controller = frameAbortRef.current;
      if (!controller || controller.signal.aborted) return;
      setFrames((current) =>
        current.map((frame) =>
          frame.dream.id === dream.id
            ? { ...frame, status: "loading", imageUrl: undefined }
            : frame
        )
      );
      void fetchFrame(dream, controller.signal);
    },
    [fetchFrame]
  );

  const markFrameError = useCallback((dreamId: number) => {
    setFrames((current) =>
      current.map((frame) =>
        frame.dream.id === dreamId
          ? { ...frame, status: "error", imageUrl: undefined }
          : frame
      )
    );
  }, []);

  if (authStatus === "checking" || isLoading) return <Loading />;
  if (!profile) return null;

  return (
    <div
      className="relative min-h-screen overflow-hidden pb-24 text-white"
      style={{
        background: `linear-gradient(180deg, ${profile.color}44 0%, rgba(28, 20, 48, 0.98) 62%, #140f24 62%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-24 h-28 w-20 rounded-t-full border-4 border-white/20 bg-sky-200/20 shadow-[inset_0_0_30px_rgba(255,255,255,0.12)] sm:right-12"
      />

      <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link
            href={`/forest/${profile.id}`}
            className="flex min-h-[44px] shrink-0 items-center px-1 text-white/80 hover:text-white"
          >
            <ChevronLeft className="mr-1 h-5 w-5" /> へやから でる
          </Link>
          <h1 className="ml-3 min-w-0 flex-1 truncate text-lg font-bold">
            {profile.avatar_emoji} {profile.name} の おへや
          </h1>
        </div>
      </header>

      <main className="container relative z-[2] mx-auto max-w-3xl px-4 pt-8">
        {dreams.length === 0 ? (
          <RoomEmptyState
            icon="🛏️"
            message="まだ ゆめが きろくされていないよ"
            href="/dream/new"
            action="ゆめを きろくする"
          />
        ) : frameDreams.length === 0 ? (
          <RoomEmptyState
            icon="🖼️"
            message="まだ えが かざられていないよ"
            href={`/dream/${dreams[0].id}`}
            action="ゆめのえを つくる"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {frames.map((frame) => (
              <FrameCard
                key={frame.dream.id}
                frame={frame}
                profileColor={profile.color}
                reduceMotion={Boolean(reduceMotion)}
                onOpen={() => router.push(`/dream/${frame.dream.id}`)}
                onRetry={() => retryFrame(frame.dream)}
                onImageError={() => markFrameError(frame.dream.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RoomEmptyState({
  icon,
  message,
  href,
  action,
}: {
  icon: string;
  message: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-4 text-center">
      <span className="text-6xl" aria-hidden="true">{icon}</span>
      <p className="text-lg font-bold text-white/90">{message}</p>
      <Link
        href={href}
        className="mt-2 rounded-full bg-gradient-to-br from-violet-600 to-sky-400 px-5 py-2 text-sm font-bold text-white shadow-lg"
      >
        {action}
      </Link>
    </div>
  );
}

function FrameCard({
  frame,
  profileColor,
  reduceMotion,
  onOpen,
  onRetry,
  onImageError,
}: {
  frame: Frame;
  profileColor: string;
  reduceMotion: boolean;
  onOpen: () => void;
  onRetry: () => void;
  onImageError: () => void;
}) {
  return (
    <div data-testid={`room-frame-${frame.dream.id}`}>
      <AnimatePresence mode="wait">
        {frame.status === "loaded" && frame.imageUrl ? (
          <motion.button
            key="loaded"
            type="button"
            onClick={onOpen}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="relative aspect-square w-full overflow-hidden rounded-2xl border-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-950"
            style={{ borderColor: `${profileColor}88` }}
            aria-label={`${frame.dream.title || "ラベルなし"}をひらく`}
          >
            <Image
              src={frame.imageUrl}
              alt={frame.dream.title || "ラベルなし"}
              fill
              sizes="(max-width: 640px) 45vw, 220px"
              className="object-cover"
              unoptimized
              onError={onImageError}
            />
          </motion.button>
        ) : frame.status === "error" ? (
          <div
            key="error"
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-4 border-dashed p-2 text-center"
            style={{ borderColor: `${profileColor}55` }}
          >
            <span className="text-2xl" aria-hidden="true">💔</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              もういちど
            </button>
          </div>
        ) : (
          <div
            key="loading"
            className="aspect-square animate-pulse rounded-2xl border-4 motion-reduce:animate-none"
            style={{ borderColor: `${profileColor}33`, background: `${profileColor}11` }}
            aria-label={`${frame.dream.title || "ラベルなし"}を読み込み中`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
