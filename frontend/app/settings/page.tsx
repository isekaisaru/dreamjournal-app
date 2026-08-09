"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Loading from "../loading";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { updateProfile } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import type { AgeGroup, AnalysisTone } from "@/app/types";
import MorpheusAvatar from "@/app/components/MorpheusAvatar";
import MorpheusLoginRequired from "@/app/components/MorpheusLoginRequired";

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

const SETTINGS_TABS = [
  { id: "profile", label: "プロフィール" },
  { id: "notifications", label: "通知" },
  { id: "plan", label: "プラン" },
  { id: "account", label: "アカウント" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

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
  const { authStatus, userId, user, deleteUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // プロフィール編集フォーム用 state
  const [profileUsername, setProfileUsername] = useState(user?.username ?? "");
  const [profileAgeGroup, setProfileAgeGroup] = useState<AgeGroup>(user?.age_group ?? "child");
  const [profileTone, setProfileTone] = useState<AnalysisTone>(user?.analysis_tone ?? "auto");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isToneOpen, setIsToneOpen] = useState(false);

  // verify 完了後 (user が null → 実データ) に state を同期する
  useEffect(() => {
    if (!user) return;
    setProfileUsername(user.username ?? "");
    setProfileAgeGroup(user.age_group ?? "child");
    setProfileTone(user.analysis_tone ?? "auto");
  }, [user?.id, user?.username, user?.age_group, user?.analysis_tone]);

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
  const [deleteError, setDeleteError] = useState("");
  const [isDeleted, setIsDeleted] = useState(false);

  // モーダルを開くたびに問題を再生成
  const openDeleteModal = () => {
    setMathProblem(generateMathProblem());
    setUserAnswer("");
    setErrorMsg("");
    setDeleteError("");
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
    if (!userId) {
      setDeleteError(
        "ログイン情報を確認できませんでした。もう一度ログインしてください。"
      );
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      // 削除成功時のローカル認証状態クリアは deleteUser() が行う
      await deleteUser();
      setIsDeleteModalOpen(false);
      setIsDeleted(true);
    } catch {
      // 失敗時はモーダルを開いたままエラーを表示し、ログアウト・遷移しない
      setDeleteError(
        "さくじょに しっぱいしました。しばらくしてから もういちど ためしてね。"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // 削除完了画面（認証状態クリア後も「おかえり！」等を出さずに完了を伝える）
  if (isDeleted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4 bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
          <div className="text-4xl" aria-hidden="true">
            🌙
          </div>
          <h1 className="text-xl font-bold">アカウントを さくじょしました</h1>
          <p className="text-sm text-muted-foreground">
            これまで つかってくれて ありがとう。
            <br />
            また あそびに きてね。
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            トップページへ
          </Link>
        </div>
      </div>
    );
  }

  if (authStatus === "checking") {
    return <Loading />;
  }

  // 未認証ガード: 設定画面（削除導線を含む）を表示しない
  if (authStatus === "unauthenticated") {
    return (
      <MorpheusLoginRequired
        title="設定を開くにはログインが必要だよ"
        message="保護者メニューは、アカウントの大切な設定を行う場所です。ログインすると、プロフィールやアカウントの設定ができます。"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ヘッダーエリア */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link
            href="/home"
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pr-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            もどる
          </Link>
          <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent">
            設定
          </h1>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
        {user?.trial_user && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-foreground mb-1">お試し中</p>
            <p className="text-muted-foreground mb-3">
              とうろくすると、プロフィールを5つまで作れたり、ゆめをずっと のこせるよ。
            </p>
            <Link
              href="/register"
              className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              とうろくして ぜんぶ つかう
            </Link>
          </div>
        )}

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
            <MorpheusAvatar
              variant="settings"
              size={112}
              className="shadow-lg ring-white/25"
            />
          </div>
        </section>

        <div
          role="tablist"
          aria-label="設定メニュー"
          className="flex gap-1 overflow-x-auto border-b border-border px-1"
        >
          {SETTINGS_TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  let nextIndex: number | null = null;
                  if (event.key === "ArrowRight") {
                    nextIndex = (index + 1) % SETTINGS_TABS.length;
                  } else if (event.key === "ArrowLeft") {
                    nextIndex =
                      (index - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length;
                  } else if (event.key === "Home") {
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    nextIndex = SETTINGS_TABS.length - 1;
                  }

                  if (nextIndex === null) return;
                  event.preventDefault();
                  const nextTab = SETTINGS_TABS[nextIndex];
                  setActiveTab(nextTab.id);
                  document.getElementById(`settings-tab-${nextTab.id}`)?.focus();
                }}
                className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* プロフィール設定 */}
        {activeTab === "profile" && (
        <div
          id="settings-panel-profile"
          role="tabpanel"
          aria-labelledby="settings-tab-profile"
          className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start"
        >
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

        {/* 夢プロフィール */}
        <section className="space-y-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-primary flex items-center">
              <span className="text-2xl mr-2">👨‍👩‍👧‍👦</span>
              夢プロフィール
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              家族やペットのプロフィールを作って、誰の夢かを記録できます。最大5つまで。
            </p>
            <Link
              href="/profiles"
              className="block w-full py-3 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors text-center"
            >
              プロフィールを管理する →
            </Link>
          </div>
        </section>
        </div>
        )}

        {activeTab === "notifications" && (
          <section
            id="settings-panel-notifications"
            role="tabpanel"
            aria-labelledby="settings-tab-notifications"
            className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-xl"
              >
                🔔
              </span>
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  通知設定は準備中です
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  起床リマインダーや月次サマリー通知は、保存用APIを整備してから提供します。
                  現在は変更できるように見えるスイッチを置かず、確実に保存できる状態になってから公開します。
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "plan" && (
          <section
            id="settings-panel-plan"
            role="tabpanel"
            aria-labelledby="settings-tab-plan"
            className="max-w-2xl rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-sm"
          >
            <h2 className="mb-3 flex items-center text-lg font-bold text-foreground">
              <span className="mr-2 text-2xl">✨</span>
              プレミアムプラン
            </h2>
            {user?.premium ? (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">
                  プレミアム会員として、すべての機能をご利用いただけます。
                  <br />
                  解約・カード変更・請求履歴の確認はこちらから。
                </p>
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPortalLoading ? "準備中..." : "サブスクリプションを管理する"}
                </button>
                {portalError && (
                  <p className="mt-2 text-sm text-destructive">{portalError}</p>
                )}
              </div>
            ) : (
              <div>
                <ul className="mb-4 space-y-1 text-sm text-muted-foreground">
                  <li>✓ ゆめのAI分析（たっぷり使える）</li>
                  <li>✓ ゆめのえ生成（月31枚）</li>
                  <li>✓ 月次サマリー</li>
                </ul>
                <p className="mb-4 text-xs text-muted-foreground">
                  月額590円・いつでもキャンセルできます。
                </p>
                <Link
                  href="/subscription"
                  className="block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  月額590円でプレミアムになる
                </Link>
              </div>
            )}
          </section>
        )}

        {activeTab === "account" && (
          <div
            id="settings-panel-account"
            role="tabpanel"
            aria-labelledby="settings-tab-account"
            className="max-w-2xl space-y-6"
          >
            <section className="rounded-2xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-sm">
              <h2 className="mb-3 flex items-center text-lg font-bold text-primary">
                <span className="mr-2 text-2xl">🛡️</span>
                あんしんして つかうために
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                このアプリは、あなたの ゆめを 大切にしまっておく場所です。
                かいた ゆめは あなただけのものなので、ほかのひとに 見られません。
                かぞくみんなで、あんしんして つかってね。
              </p>
            </section>

            <section className="space-y-4 border-t border-border/30 pt-6">
              <h3 className="px-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                アカウントの せってい
              </h3>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="mb-1 text-base font-bold">
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
                      className="ml-4 shrink-0 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground shadow-sm transition-all duration-300 hover:bg-destructive/90"
                    >
                      さくじょ
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

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

                {deleteError && (
                  <p
                    role="alert"
                    className="text-destructive text-sm font-bold"
                  >
                    {deleteError}
                  </p>
                )}

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
