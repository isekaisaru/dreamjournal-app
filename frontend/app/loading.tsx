"use client";

import React, { useEffect, useState } from "react";

// ログインの確認やページの読み込みに時間がかかったら、理由と「よみこみなおす」ボタンを出す。
// サーバー（Render）が寝ていると確認に20秒以上かかり、つながらないときは
// 何の案内もなく回り続けていた（2026-11-25）。
const SLOW_LOADING_AFTER_MS = 10_000;

const Loading = () => {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        className="flex flex-col items-center gap-4"
        role="status"
        aria-label="よみこんでいるよ"
      >
        <div className="h-16 w-16 rounded-full border-t-4 border-primary animate-spin"></div>
        <p className="text-sm font-medium text-muted-foreground">
          よみこんでいるよ...
        </p>
        {isSlow && (
          <p className="max-w-xs text-sm text-muted-foreground">
            じかんが かかっているね。サーバーを おこしているところかもしれないよ（さいしょは 30びょうほど かかることがあるよ）。
          </p>
        )}
      </div>
      {isSlow && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          もういちど よみこむ
        </button>
      )}
    </div>
  );
};

export default Loading;
