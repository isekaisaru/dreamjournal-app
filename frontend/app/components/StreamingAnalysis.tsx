"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmotionTag } from "./EmotionTag";
import MorpheusAvatar from "./MorpheusAvatar";

function getSeenStorageKey(storageKey?: string) {
  return storageKey ? `yumetree:streaming-analysis:${storageKey}` : null;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function useTypewriter(
  fullText: string,
  options: {
    charsPerTick?: number;
    tickMs?: number;
    skip?: boolean;
    onDone?: () => void;
  } = {}
) {
  const { charsPerTick = 2, tickMs = 24, skip = false, onDone } = options;
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;

    if (!fullText || skip || prefersReducedMotion()) {
      setShown(fullText);
      setDone(true);
      onDone?.();
      return;
    }

    setShown("");
    setDone(false);

    const intervalId = window.setInterval(() => {
      indexRef.current += charsPerTick;

      if (indexRef.current >= fullText.length) {
        setShown(fullText);
        setDone(true);
        onDone?.();
        window.clearInterval(intervalId);
        return;
      }

      setShown(fullText.slice(0, indexRef.current));
    }, tickMs);

    return () => window.clearInterval(intervalId);
  }, [charsPerTick, fullText, onDone, skip, tickMs]);

  return { shown, done };
}

type StreamingAnalysisProps = {
  title: string;
  text: string;
  emotions?: string[];
  storageKey?: string;
};

export default function StreamingAnalysis({
  title,
  text,
  emotions = [],
  storageKey,
}: StreamingAnalysisProps) {
  const seenStorageKey = useMemo(
    () => getSeenStorageKey(storageKey),
    [storageKey]
  );
  const [hasSeen, setHasSeen] = useState(() => {
    const initialKey = getSeenStorageKey(storageKey);
    if (!initialKey || typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(initialKey) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!seenStorageKey) return;

    try {
      setHasSeen(window.localStorage.getItem(seenStorageKey) === "1");
    } catch {
      setHasSeen(false);
    }
  }, [seenStorageKey]);

  const markSeen = useCallback(() => {
    if (!seenStorageKey) return;

    try {
      window.localStorage.setItem(seenStorageKey, "1");
    } catch {
      // localStorage is an enhancement; the analysis should still render.
    }
  }, [seenStorageKey]);

  const { shown, done } = useTypewriter(text, {
    skip: hasSeen,
    onDone: markSeen,
  });

  return (
    <section className="rounded-[24px] border border-primary/20 bg-card p-5 shadow-lg">
      <header className="mb-4 flex items-center gap-4">
        <MorpheusAvatar variant="analysis" size={56} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <h2 className="text-lg font-bold leading-snug text-card-foreground">
            モルペウスが 夢を読みほどいたよ
          </h2>
        </div>
        {!done && (
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            生成中
          </span>
        )}
      </header>

      <div className="rounded-2xl bg-background/80 px-4 py-4">
        <p className="whitespace-pre-wrap text-sm leading-loose text-foreground">
          {shown}
          {!done && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 bg-primary align-middle motion-safe:animate-yt-caret"
            />
          )}
        </p>
      </div>

      {done && emotions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {emotions.map((emotion, index) => (
            <EmotionTag key={`${emotion}-${index}`} label={emotion} />
          ))}
        </div>
      )}
    </section>
  );
}
