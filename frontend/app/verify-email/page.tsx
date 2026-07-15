"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/apiClient";

type VerifyState = "verifying" | "success" | "error" | "missing-token";

// メール内リンクから開く公開ページ（ログイン不要）。
// ?token= を検証APIへ送り、結果を表示する。
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : "missing-token"
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    verifyEmail(token)
      .then(() => {
        if (!cancelled) setState("success");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {state === "verifying" && (
        <>
          <span className="mb-4 text-5xl" aria-hidden="true">
            📮
          </span>
          <h1 className="mb-2 text-xl font-bold">かくにん しているよ…</h1>
          <p className="text-sm text-white/70">
            メールアドレスを かくにんちゅうだよ。ちょっとまってね。
          </p>
        </>
      )}

      {state === "success" && (
        <>
          <span className="mb-4 text-5xl" aria-hidden="true">
            ✅
          </span>
          <h1 className="mb-2 text-xl font-bold">かくにん できたよ！</h1>
          <p className="mb-6 text-sm text-white/70">
            メールアドレスの かくにんが おわったよ。
          </p>
          <Link
            href="/home"
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
          >
            ホームへ すすむ
          </Link>
        </>
      )}

      {(state === "error" || state === "missing-token") && (
        <>
          <span className="mb-4 text-5xl" aria-hidden="true">
            😢
          </span>
          <h1 className="mb-2 text-xl font-bold">かくにん できなかったよ</h1>
          <p className="mb-6 text-sm text-white/70">
            リンクが ふるいか、まちがっているみたい。
            <br />
            せっていページから もういちど メールを おくってね。
          </p>
          <Link
            href="/settings"
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #38bdf8)" }}
          >
            せっていへ いく
          </Link>
        </>
      )}
    </main>
  );
}

export default function VerifyEmailPage() {
  // useSearchParams は Suspense 境界が必要（App Router）
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
