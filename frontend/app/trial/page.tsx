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
const MAX_TRIAL_ANALYSES = 3;

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
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisLimitReached, setAnalysisLimitReached] = useState(false);

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
        let verified: Awaited<ReturnType<typeof verifyAuth>>;
        try {
          verified = await verifyAuth();
        } catch {
          // verify が失敗したときは既存セッション保護を優先して中断する
          setAnalysisError(
            "ログインじょうたいの かくにんに しっぱい したよ。もういちど ためしてね。"
          );
          return;
        }

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
      setAnalysisCount((prev) => prev + 1);
      setTitle("");
      setDescription("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "分析に失敗しました";
      if (message.includes("分析上限")) {
        setAnalysisLimitReached(true);
        setAnalysisError("");
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
        <h1 className="text-2xl font-bold mb-2">YumeTree を体験する</h1>
        <MorpheusSmall
          expression="curious"
          title="夢を記録してみましょう"
          message="夢の内容を書いて「AIにきいてみる」を押すと、感情と意味を読み解きます。登録すると声での記録や夢の画像化にも対応します。"
        />
      </div>

      {/* 入力フォーム */}
      <div className="mb-8 p-5 sm:p-6 bg-slate-800/40 border border-slate-700/40 rounded-2xl">
        <h2 className="text-lg font-bold mb-4">夢を記録してみよう</h2>

        <div className="mb-3">
          <label htmlFor="title" className="block text-sm text-slate-400 mb-1">
            夢のタイトル（なくてもOK）
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="空を飛んだ夢"
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm text-slate-400 mb-1"
          >
            見た夢の内容
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="今朝見た夢を書いてみてください..."
            rows={4}
            className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
          />
        </div>

        {analysisError && (
          <p className="text-sm text-amber-400 mb-3">{analysisError}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* メインCTA: AI分析 */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={
              isAnalyzing ||
              isAuthChecking ||
              analysisLimitReached ||
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
            記録だけする（分析なし）
          </button>

          {/* 残り回数バッジ */}
          {!analysisLimitReached && (
            <span className="text-xs text-slate-400 sm:ml-1">
              残りAI分析:{" "}
              <span className={`font-bold ${MAX_TRIAL_ANALYSES - analysisCount <= 1 ? "text-amber-400" : "text-sky-400"}`}>
                {Math.max(0, MAX_TRIAL_ANALYSES - analysisCount)}回
              </span>
            </span>
          )}
        </div>
      </div>

      {/* 記録した夢リスト */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4">
          記録した夢 ({dreams.length}/{MAX_TRIAL_DREAMS})
        </h3>

        {dreams.length === 0 ? (
          <p className="text-sm text-slate-500">
            まだ記録がありません。上のフォームから夢を記録してみましょう。
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
                      <div className="flex gap-1.5 flex-wrap mb-2">
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
                    <p className="text-xs text-slate-500">
                      🖼️ 登録するとAIがこの夢を画像にしてくれます
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分析上限到達時のアップグレードカード */}
      {analysisLimitReached && (
        <div className="mb-6 p-5 bg-gradient-to-br from-sky-900/50 to-blue-900/50 border border-sky-500/40 rounded-2xl text-center shadow-lg shadow-sky-500/10">
          <p className="text-base font-bold text-white mb-1">
            体験版のAI分析を使い切りました
          </p>
          <p className="text-sm text-sky-200 mb-3">
            YumeTreeに登録すると、こんなことができます：
          </p>
          <ul className="text-sm text-sky-100/80 mb-4 space-y-1.5 text-left inline-block">
            <li>✨ AI分析が <span className="font-bold text-white">毎月10回</span> 使える</li>
            <li>🌙 夢を <span className="font-bold text-white">継続して記録</span> できる</li>
            <li>🎙️ <span className="font-bold text-white">声で話すだけ</span> で記録できる</li>
            <li>🖼️ AIが夢を <span className="font-bold text-white">画像にしてくれる</span></li>
          </ul>
          <p className="text-xs text-sky-300/70 mb-4">ひとりでも、大切な人とも使えます</p>
          <Link
            href="/register"
            className="
              inline-flex items-center gap-2 px-7 py-3
              bg-gradient-to-r from-sky-500 to-blue-600
              hover:from-sky-400 hover:to-blue-500
              text-white font-bold text-sm rounded-xl
              shadow-lg shadow-sky-500/30
              transition-all duration-200
            "
          >
            <Sparkles size={16} />
            YumeTreeに登録する
          </Link>
        </div>
      )}

      {/* 注意書き + 登録CTA（上限到達時は非表示） */}
      {!analysisLimitReached && (
        <div className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-2xl text-center">
          <p className="text-sm text-slate-400 mb-1">
            体験版のAI分析は <span className="text-sky-400 font-medium">3回</span> まで
          </p>
          <p className="text-xs text-slate-500 mb-4">
            体験用アカウントが自動で作成されます。登録すると声での記録・画像生成など全機能が使えます。
          </p>
          <Link
            href="/register"
            className="
              inline-flex items-center gap-2 px-6 py-2.5
              bg-gradient-to-r from-violet-500 to-purple-600
              hover:from-violet-400 hover:to-purple-500
              text-white font-bold text-sm rounded-xl
              shadow-lg shadow-violet-500/20
              transition-all duration-200
            "
          >
            <Sparkles size={16} />
            YumeTreeに登録する
          </Link>
        </div>
      )}
    </div>
  );
}
