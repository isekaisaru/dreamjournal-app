"use client";

import { useState } from "react";
import Link from "next/link";
import MorpheusSmall from "@/app/components/MorpheusSmall";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/app/types";
import { previewAnalysis, verifyAuth } from "@/lib/apiClient";
import { Sparkles, Loader2 } from "lucide-react";

type AnalysisResult = {
  analysis: string;
  emotion_tags: string[];
};

const MAX_TRIAL_DREAMS = 7;

export default function TrialPage() {
  const { authStatus, login } = useAuth();

  // 認証済みユーザーもこのページは使える（自分のアカウントでAI分析される）
  // LPからの遷移で未認証の場合は、AI分析ボタン押下時にトライアルログインを自動実行

  const [dreams, setDreams] = useState<
    { title: string; description: string; analysis?: AnalysisResult }[]
  >([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // AI分析関連
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // checking中はボタンを無効化するためのフラグ
  const isAuthChecking = authStatus === "checking";

  // トライアルログイン → AI分析の一連フロー
  const handleAnalyze = async () => {
    if (!description.trim()) {
      setAnalysisError("ゆめの おはなしを かいてね。");
      return;
    }

    if (dreams.length >= MAX_TRIAL_DREAMS) {
      setAnalysisError("ここに かける ゆめは 7こ まで だよ。");
      return;
    }

    // 認証確認中は実行しない（既存セッションを上書きしないため）
    if (isAuthChecking) {
      setAnalysisError("じゅんびちゅう... すこしまってね。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      // 未認証ならトライアルログインを行う
      if (authStatus === "unauthenticated") {
        const verified = await verifyAuth();

        if (verified?.user) {
          login(verified.user);
        } else {
          setIsLoggingIn(true);
          const timestamp = Date.now();
          const res = await apiClient.post<{ user: User }>("/auth/trial_login", {
            trial_user: {
              email: `trial_${timestamp}@example.com`,
              username: `trial_${timestamp}`,
              password: "trial_password_123",
              password_confirmation: "trial_password_123",
            },
          });
          if (res?.user) {
            login({ ...res.user, id: String(res.user.id) });
          }
          setIsLoggingIn(false);
          // Cookieが設定されるのを待つ
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // AI分析を実行
      const result = await previewAnalysis(description);

      // 夢リストに分析結果付きで追加
      setDreams((prev) => [
        ...prev,
        {
          title: title || `ゆめ ${prev.length + 1}`,
          description,
          analysis: result,
        },
      ]);
      setTitle("");
      setDescription("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "分析に失敗しました";
      if (message.includes("分析上限")) {
        setAnalysisError(
          "おためしの ぶんせきは ここまでだよ。とうろくすると もっと つかえるよ！"
        );
      } else {
        setAnalysisError("ぶんせきに しっぱい しちゃった。もういちど ためしてね。");
      }
    } finally {
      setIsAnalyzing(false);
      setIsLoggingIn(false);
    }
  };

  // 分析なしで記録だけ
  const addDreamWithoutAnalysis = () => {
    if (!title && !description) {
      return;
    }
    if (dreams.length >= MAX_TRIAL_DREAMS) {
      setAnalysisError("ここに かける ゆめは 7こ まで だよ。");
      return;
    }
    setDreams((prev) => [
      ...prev,
      { title: title || `ゆめ ${prev.length + 1}`, description },
    ]);
    setTitle("");
    setDescription("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">お試し体験</h1>
        <MorpheusSmall
          title="ようこそ！ぼくが あんないするよ"
          message="ゆめを かいて「AIにきいてみる」をおすと、ぼくが ゆめの いみを おしえるよ！"
        />
      </div>

      {/* 入力フォーム */}
      <div className="mb-8 p-5 sm:p-6 bg-slate-800/40 border border-slate-700/40 rounded-2xl">
        <h2 className="text-lg font-bold mb-4">ゆめを かいてみよう</h2>

        <div className="mb-3">
          <label htmlFor="title" className="block text-sm text-slate-400 mb-1">
            ゆめの なまえ（なくてもOK）
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="そらを とんだ ゆめ"
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm text-slate-400 mb-1"
          >
            みた ゆめの おはなし
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="きのう みた ゆめを ここに かいてね..."
            rows={4}
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
          />
        </div>

        {analysisError && (
          <p className="text-sm text-amber-400 mb-3">{analysisError}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {/* メインCTA: AI分析 */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={
              isAnalyzing ||
              isAuthChecking ||
              dreams.length >= MAX_TRIAL_DREAMS ||
              !description.trim()
            }
            className="
              inline-flex items-center justify-center gap-2 px-6 py-2.5
              bg-gradient-to-r from-sky-500 to-blue-600
              hover:from-sky-400 hover:to-blue-500
              disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed
              text-white font-bold text-sm rounded-xl
              shadow-lg shadow-sky-500/20
              transition-all duration-200
            "
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isLoggingIn ? "じゅんびちゅう..." : "ぶんせきちゅう..."}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AIにきいてみる
              </>
            )}
          </button>

          {/* サブ: 記録だけ */}
          <button
            type="button"
            onClick={addDreamWithoutAnalysis}
            disabled={
              dreams.length >= MAX_TRIAL_DREAMS || !description.trim()
            }
            className="
              inline-flex items-center justify-center px-5 py-2.5
              bg-slate-700/50 hover:bg-slate-700/70
              disabled:opacity-40 disabled:cursor-not-allowed
              text-slate-300 text-sm rounded-xl border border-slate-600/40
              transition-all duration-200
            "
          >
            かくだけ（ぶんせきなし）
          </button>
        </div>
      </div>

      {/* 記録した夢リスト */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">
          かいた ゆめ ({dreams.length}/{MAX_TRIAL_DREAMS})
        </h3>

        {dreams.length === 0 ? (
          <p className="text-sm text-slate-500">
            まだ なにも かいていないよ。うえに ゆめを かいてみよう。
          </p>
        ) : (
          <div className="space-y-4">
            {dreams.map((dream, index) => (
              <div
                key={index}
                className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-2xl"
              >
                <h4 className="font-bold text-sm text-slate-200 mb-1">
                  {dream.title}
                </h4>
                <p className="text-sm text-slate-400 mb-3">
                  {dream.description}
                </p>

                {/* AI分析結果 */}
                {dream.analysis && (
                  <div className="p-3 bg-slate-900/50 border border-sky-500/20 rounded-xl">
                    <p className="text-xs text-sky-400 font-medium mb-1">
                      モルペウスの分析
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed mb-2">
                      {dream.analysis.analysis}
                    </p>
                    {dream.analysis.emotion_tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {dream.analysis.emotion_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-sky-500/15 text-sky-300 border border-sky-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 注意書き + 登録CTA */}
      <div className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-2xl text-center">
        <p className="text-sm text-slate-400 mb-1">
          おためしの ぶんせきは <span className="text-sky-400 font-medium">3かい</span> まで
        </p>
        <p className="text-xs text-slate-500 mb-4">
          おためしアカウントが じどうで つくられるよ。とうろくすると ぜんぶの きのうが つかえるよ。
        </p>
        <Link
          href="/register"
          className="
            inline-flex items-center gap-2 px-6 py-2.5
            bg-slate-700/50 hover:bg-slate-700/70
            text-slate-200 font-bold text-sm rounded-xl
            border border-slate-600/40 hover:border-sky-500/40
            transition-all duration-200
          "
        >
          とうろくして ずっと のこす
        </Link>
      </div>
    </div>
  );
}
