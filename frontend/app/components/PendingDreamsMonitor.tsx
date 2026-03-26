"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Dream } from "@/app/types";
import { useAuth } from "@/context/AuthContext";

/** ポーリングのタイムアウト上限: 3分 */
const POLLING_TIMEOUT_MS = 3 * 60 * 1000;

export default function PendingDreamsMonitor() {
  const router = useRouter();
  const { authStatus } = useAuth();
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pollInterval, setPollInterval] = useState(5000);
  const failedAttemptsRef = useRef(0);
  // 処理済みIDを永続的に記録 (重複処理防止)
  const processedIdsRef = useRef<Set<number>>(new Set());
  // ポーリング開始時刻 (タイムアウト判定用)
  const pollingStartTimeRef = useRef<number | null>(null);
  // タイムアウト状態
  const [isTimedOut, setIsTimedOut] = useState(false);

  // マウントログ
  useEffect(() => {
    console.log("[PendingDreamsMonitor] Mounted (Single Instance Check)");
    return () => console.log("[PendingDreamsMonitor] Unmounted");
  }, []);

  // 保留中リストの更新 (API)
  const refreshPendingList = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    try {
      // 最新の夢を取得してpendingのものを探す
      // Note: キャッシュを確実に回避するためタイムスタンプ付与も検討できるが、
      // apiClient側で no-store しているので通常は不要。
      const dreams = await apiClient.get<Dream[]>("/dreams");

      const ids = dreams
        .filter((d) => d.analysis_status === "pending")
        .map((d) => d.id);

      // 前回のpendingIdsと比較して変更があれば更新
      setPendingIds((prev) => {
        const isSame =
          prev.length === ids.length &&
          prev.every((val, index) => val === ids[index]);
        if (isSame) return prev;

        console.log(
          `[PendingDreamsMonitor] Detected pending dreams: ${ids.join(", ")}`
        );
        return ids;
      });

      if (ids.length > 0) {
        setPollInterval(5000);
        failedAttemptsRef.current = 0;
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("401")) {
        console.warn(
          "[PendingDreamsMonitor] Failed to fetch pending dreams:",
          error
        );
      }
    }
  }, [authStatus]);

  // タイムアウトをリセットして再試行
  const handleRetry = useCallback(() => {
    console.log("[PendingDreamsMonitor] Retry triggered by user");
    setIsTimedOut(false);
    pollingStartTimeRef.current = null;
    failedAttemptsRef.current = 0;
    setPollInterval(5000);
    refreshPendingList();
  }, [refreshPendingList]);

  // イベントリスナー設定 (録音完了通知を受け取る)
  useEffect(() => {
    refreshPendingList();

    const handleDreamCreated = () => {
      console.log("[PendingDreamsMonitor] dream-created event received");
      // 新しい夢が作成されたらタイムアウト状態をリセット
      setIsTimedOut(false);
      pollingStartTimeRef.current = null;
      refreshPendingList();
    };

    window.addEventListener("dream-created", handleDreamCreated);
    return () => {
      window.removeEventListener("dream-created", handleDreamCreated);
    };
  }, [refreshPendingList]);

  // ポーリングロジック (routerへの依存を排除)
  useEffect(() => {
    if (pendingIds.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log(
          "[PendingDreamsMonitor] Polling stopped (no pending dreams)"
        );
      }
      // pendingIdsが空になったらタイムアウト状態もリセット
      pollingStartTimeRef.current = null;
      return;
    }

    // ポーリング開始時刻を記録 (初回のみ)
    if (pollingStartTimeRef.current === null) {
      pollingStartTimeRef.current = Date.now();
      console.log(
        `[PendingDreamsMonitor] Polling started at ${new Date().toISOString()}`
      );
    }

    console.log(
      `[PendingDreamsMonitor] Starting polling for: ${pendingIds.join(", ")}`
    );

    const checkStatuses = async () => {
      if (document.hidden) return;

      // タイムアウト判定: 3分以上ポーリングしていたら中断
      if (
        pollingStartTimeRef.current !== null &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT_MS
      ) {
        console.warn(
          `[PendingDreamsMonitor] Polling timed out after ${POLLING_TIMEOUT_MS / 1000}s for dreams: ${pendingIds.join(", ")}`
        );
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTimedOut(true);
        return;
      }

      try {
        const idsParam = pendingIds.join(",");
        // Fix: 401 error by adding credentials and headers
        const res = await fetch(
          `/api/dreams/statuses?ids=${idsParam}&t=${Date.now()}`,
          {
            credentials: "include", // 必須: これがないとCookieが送られない
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            console.warn(
              "[PendingDreamsMonitor] 401 Unauthorized during polling. User might be logged out."
            );
          }
          failedAttemptsRef.current += 1;
          const backoff = Math.min(
            60000,
            5000 * Math.pow(1.5, failedAttemptsRef.current)
          );
          setPollInterval(backoff);
          return;
        }

        const statusMap: Record<string, string> = await res.json();

        // 完了または失敗したものを抽出
        const completedIds = pendingIds.filter((id) => {
          const status = statusMap[id.toString()];
          return status === "done" || status === "failed";
        });

        // まだ処理していないIDのみ対象にする
        const newCompletedIds = completedIds.filter(
          (id) => !processedIdsRef.current.has(id)
        );

        if (newCompletedIds.length > 0) {
          console.log(
            `[PendingDreamsMonitor] Analysis completed for dreams: ${newCompletedIds.join(", ")}`
          );

          // 処理済みマーク
          newCompletedIds.forEach((id) => processedIdsRef.current.add(id));

          // 監視対象から外す
          setPendingIds((prev) =>
            prev.filter((id) => !newCompletedIds.includes(id))
          );

          // 画面更新処理 (1回だけ実行)
          console.log(
            `[PendingDreamsMonitor] Triggering router.refresh() for dreams: ${newCompletedIds.join(", ")}`
          );

          // refreshのみ実行 (replaceは不要、refreshでサーバーコンポーネントが再描画される)
          // 確実にサーバーデータを反映させるため、待機時間を延長 (Race Condition対策)
          setTimeout(() => {
            router.refresh();
            console.log("[PendingDreamsMonitor] router.refresh() executed");

            window.dispatchEvent(new Event("dream-analysis-completed"));
          }, 2000); // DB書き込みとAPI反映のラグを考慮して2秒待機

          setPollInterval(5000);
          failedAttemptsRef.current = 0;
        }
      } catch (error) {
        console.error("[PendingDreamsMonitor] Polling error", error);
      }
    };

    // インターバル開始
    intervalRef.current = setInterval(checkStatuses, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // routerを依存配列から除外。pendingIdsかpollIntervalが変わった時だけ再設定。
  }, [pendingIds, pollInterval, router]);

  // タイムアウト時: 再試行を促すバナーを表示
  if (isTimedOut) {
    return (
      <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-950/90 text-amber-100 rounded-full shadow-lg border border-amber-700/50 backdrop-blur-sm">
          <span className="text-base">⏱</span>
          <span className="text-xs font-medium">かんがえるのに時間がかかってるよ</span>
          <button
            onClick={handleRetry}
            className="text-xs font-bold underline underline-offset-2 text-amber-300 hover:text-amber-100 transition-colors"
          >
            もういちど
          </button>
        </div>
      </div>
    );
  }

  // pending中: 解析中バナーを表示
  if (pendingIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-2 fade-in pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 text-slate-100 rounded-full shadow-lg border border-slate-700/50 backdrop-blur-sm pointer-events-auto">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
        </div>
        <span className="text-xs font-medium pr-1">
          {pendingIds.length}件の夢を解析中...
        </span>
      </div>
    </div>
  );
}
