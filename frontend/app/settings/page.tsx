"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Loading from "../loading";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { updateProfile } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import type { AgeGroup, AnalysisTone } from "@/app/types";
import MorpheusImage from "@/app/components/MorpheusImage";

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "child_small", label: "6さい いか" },
  { value: "child",       label: "7〜9さい" },
  { value: "preteen",     label: "10〜12さい" },
  { value: "teen",        label: "13〜15さい" },
  { value: "adult",       label: "16さい いじょう" },
];

const ANALYSIS_TONE_OPTIONS: { value: AnalysisTone; label: string; desc: string }[] = [
  { value: "auto",        label: "じどうで あわせる",    desc: "年れいたいに合わせて自動でえらぶ" },
  { value: "gentle_kids", label: "やさしく・ひらがなで", desc: "ひらがな多め・こわくない説明" },
  { value: "junior",      label: "小中学生むけ",         desc: "わかりやすい語句・少し詳しく" },
  { value: "standard",    label: "ふつう",               desc: "一般的な日本語で" },
  { value: "deep",        label: "くわしく",             desc: "少し詳しい分析" },
];

// ジュニアロックのための簡単な計算問題を生成する関数
const generateMathProblem = () => {
  const a = Math.floor(Math.random() * 9) + 1; // 1-9
  const b = Math.floor(Math.random() * 9) + 1; // 1-9
  return {
    question: `${a} + ${b} = ?`,
    answer: (a + b).toString(),
  };
};

const SettingsPage = () => {
  const { authStatus, userId, user, logout, deleteUser } = useAuth();
  const router = useRouter();

  // プロフィール編集フォーム用 state
  const [profileUsername, setProfileUsername] = useState(user?.username ?? "");
  const [profileAgeGroup, setProfileAgeGroup] = useState<AgeGroup>(user?.age_group ?? "child");
  const [profileTone, setProfileTone] = useState<AnalysisTone>(user?.analysis_tone ?? "auto");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isToneOpen, setIsToneOpen] = useState(false);

  // 初回レンダー時は user === null (checking中)なので、verify 完了後に再同期する
  useEffect(() => {
    if (!user) return;
    setProfileUsername(user.username ?? "");
    setProfileAgeGroup(user.age_group ?? "child");
    setProfileTone(user.analysis_tone ?? "auto");
  }, [user?.id, user?.username, user?.age_group, user?.analysis_tone]);

  // 初回レンダー時は user === null (checking中)なので、verify 完了後に再同期する
  useEffect(() => {
    if (!user) return;
    setProfileUsername(user.username ?? "");
    setProfileAgeGroup(user.age_group ?? "child");
    setProfileTone(user.analysis_tone ?? "auto");
  }, [user?.id]);

  const handleSaveProfile = async () => {
    if (!profileUsername.trim()) {
      toast.error("ニックネームを いれてね。");
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile({
        username: profileUsername.trim(),
        age_group: profileAgeGroup,
        analysis_tone: profileTone,
      });
      toast.success("プロフィールを ほぞんしたよ！");
    } catch {
      toast.error("ほぞんできなかったよ。もういちど ためしてね。");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    setPortalError(null);
    try {
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) {
        throw new Error("管理ページの準備に失敗しました。");
      }
      window.location.assign(data.url);
    } catch (error) {
      setPortalError(
        error instanceof Error ? error.message : "エラーが発生しました。"
      );
      setIsPortalLoading(false);
    }
  };

  // モーダルとロックの状態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [step, setStep] = useState<"lock" | "confirm">("lock"); // lock: 計算, confirm: 最終確認

  // ジュニアロック用
  const [mathProblem, setMathProblem] = useState({ question: "", answer: "" });
  const [userAnswer, setUserAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);

  // モーダルを開くたびに問題を再生成
  const openDeleteModal = () => {
    setMathProblem(generateMathProblem());
    setUserAnswer("");
    setErrorMsg("");
    setStep("lock");
    setIsDeleteModalOpen(true);
  };

  const handleJuniorLockSubmit = () => {
    if (userAnswer === mathProblem.answer) {
      setStep("confirm");
      setErrorMsg("");
    } else {
      setErrorMsg("こたえ が ちがいます。もういちど やってみてね。");
      setUserAnswer("");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (userId) {
        await deleteUser();
        logout();
        router.push("/");
      } else {
        console.error("ユーザーIDが見つかりません。");
      }
    } catch (error) {
      console.error("ユーザー削除に失敗しました。", error);
      alert(
        "アカウントの削除に失敗しました。 しばらくしてから実行してください。"
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (authStatus === "checking") {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ヘッダーエリア */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link
            href="/home"
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pr-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            もどる
          </Link>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            保護者メニュー
          </h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section className="overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-950 p-5 text-white shadow-lg">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                Settings Guide
              </p>
              <h2 className="mt-2 text-xl font-black">モルペウスと せっていしよう</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                年れいや分析スタイルを合わせると、ゆめの説明がもっと読みやすくなるよ。
              </p>
            </div>
            <MorpheusImage variant="settings" size={150} />
          </div>
        </section>

        {/* プロフィール設定 */}
        <section className="space-y-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-primary flex items-center">
              <span className="text-2xl mr-2">👤</span>
              プロフィール せってい
            </h2>
            <div className="space-y-5">
              {/* ニックネーム */}
              <div>
                <label htmlFor="profile-username" className="mb-1 block text-sm font-medium text-card-foreground">
                  ニックネーム
                </label>
                <input
                  id="profile-username"
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="みんなに よばれたい なまえ"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* 年齢帯 */}
              <div>
                <label htmlFor="profile-age-group" className="mb-1 block text-sm font-medium text-card-foreground">
                  とし（ねんれいたい）
                </label>
                <select
                  id="profile-age-group"
                  value={profileAgeGroup}
                  onChange={(e) => setProfileAgeGroup(e.target.value as AgeGroup)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground focus:ring-2 focus:ring-ring"
                >
                  {AGE_GROUP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 分析トーン（詳細設定・アコーディオン） */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsToneOpen((v) => !v)}
                  aria-expanded={isToneOpen}
                  aria-controls="analysis-tone-options"
                  className="flex w-full items-center justify-between text-sm font-medium text-card-foreground py-1"
                >
                  <span>ゆめ分析の スタイル（くわしい せってい）</span>
                  <span className="text-muted-foreground text-xs">{isToneOpen ? "▲ とじる" : "▼ ひらく"}</span>
                </button>
                {!isToneOpen && (
                  <p className="text-xs text-muted-foreground mt-1">
                    いま：{ANALYSIS_TONE_OPTIONS.find((o) => o.value === profileTone)?.label ?? profileTone}
                  </p>
                )}
                {isToneOpen && (
                  <div id="analysis-tone-options" className="space-y-2 mt-2">
                    {ANALYSIS_TONE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                          profileTone === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="analysis-tone"
                          value={opt.value}
                          checked={profileTone === opt.value}
                          onChange={() => setProfileTone(opt.value)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full min-h-12 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isSavingProfile ? "ほぞんしているよ..." : "ほぞんする"}
              </button>
            </div>
          </div>
        </section>

        {/* 安心感を与えるメッセージセクション */}
        <section className="space-y-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-primary flex items-center">
              <span className="text-2xl mr-2">🛡️</span>
              あんしんして つかうために
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              このアプリは、あなたの ゆめを 大切にしまっておく場所です。
              かいた ゆめは あなただけのものなので、ほかのひとに 見られません。
              かぞくみんなで、あんしんして つかってね。
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-foreground flex items-center">
              <span className="text-2xl mr-2">✨</span>
              プレミアムプラン
            </h2>
            {user?.premium ? (
              <div>
                <p className="text-muted-foreground text-sm mb-4">
                  プレミアム会員として、すべての機能をご利用いただけます。
                  <br />
                  解約・カード変更・請求履歴の確認はこちらから。
                </p>
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                  className="w-full py-3 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPortalLoading ? "準備中..." : "サブスクリプションを管理する"}
                </button>
                {portalError && (
                  <p className="mt-2 text-sm text-destructive">{portalError}</p>
                )}
              </div>
            ) : (
              <div>
                <ul className="text-muted-foreground text-sm mb-4 space-y-1">
                  <li>✓ ゆめのAI分析（むせいげん）</li>
                  <li>✓ ゆめのえ生成（月31枚）</li>
                  <li>✓ 月次サマリー</li>
                </ul>
                <p className="text-muted-foreground text-xs mb-4">月額500円・いつでもキャンセルできます。</p>
                <Link
                  href="/subscription"
                  className="block w-full py-3 px-4 rounded-xl bg-primary text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  月額500円でプレミアムになる
                </Link>
              </div>
            )}
          </div>

        </section>

        {/* 設定・操作セクション */}
        <section className="space-y-4 pt-4 border-t border-border/30">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">
            アカウントの せってい
          </h3>

          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base mb-1">
                    アカウントをさくじょする
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    これまでの ゆめが すべて きえてしまいます。
                    <br />
                    もとには もどせません。
                  </p>
                </div>
                <button
                  onClick={openDeleteModal}
                  className="shrink-0 ml-4 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 font-bold px-4 py-2 rounded-lg text-sm border border-destructive/20"
                >
                  さくじょ
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* フッター的なメッセージ */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-muted-foreground/60">
            Dream Journal for Families
          </p>
        </div>
      </main>

      {/* 削除確認モーダル */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border/50 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Step 1: ジュニアロック (計算問題) */}
            {step === "lock" && (
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-3xl">
                  🔐
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">
                    おとなのひとに
                    <br />
                    きいてみてね
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    これは つぎに すすむための カギです。
                    <br />
                    こたえは なにかな？
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <div className="text-3xl font-mono font-bold tracking-wider text-center text-primary mb-4">
                    {mathProblem.question}
                  </div>
                  <input
                    type="tel"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="w-full text-center text-xl p-2 rounded-lg bg-background border border-input focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="?に入る数字"
                    autoFocus
                  />
                  {errorMsg && (
                    <p className="text-destructive text-sm font-bold mt-2 animate-pulse">
                      {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors"
                  >
                    やめる
                  </button>
                  <button
                    onClick={handleJuniorLockSubmit}
                    disabled={!userAnswer}
                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                  >
                    すすむ
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 最終確認 */}
            {step === "confirm" && (
              <div className="p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                  ⚠️
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-destructive">
                    ほんとうに けしますか？
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    アカウントを さくじょすると、
                    <br />
                    これまでの ゆめ日記が
                    <br />
                    <strong>ぜんぶ きえてしまいます。</strong>
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    ※このそうさは とりけせません。
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full py-3 px-4 rounded-xl bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-destructive/25"
                  >
                    {isDeleting
                      ? "さくじょ中..."
                      : "はい、すべて さくじょします"}
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    disabled={isDeleting}
                    className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-muted text-muted-foreground font-bold transition-colors"
                  >
                    やめる
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
