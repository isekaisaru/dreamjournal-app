"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Loading from "../loading";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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
  const { isLoggedIn, userId, logout, deleteUser } = useAuth();
  const router = useRouter();
  
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

  if (isLoggedIn === null) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* ヘッダーエリア */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link 
            href="/my-dreams" 
            className="flex items-center text-muted-foreground hover:text-primary transition-colors pr-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            もどる
          </Link>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            おとなのきまり
          </h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        
        {/* 安心感を与えるメッセージセクション */}
        <section className="space-y-4">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-primary flex items-center">
              <span className="text-2xl mr-2">🛡️</span> 
              あんしんして つかうために
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              このアプリは、あなたの ゆめを 大切にしまっておく場所です。<br/>
              かぞくみんなで、あんしんして つかえるように、<br />
              いくつかの おやくそくが あります。
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-3 text-secondary flex items-center">
              <span className="text-2xl mr-2">🤫</span> 
              ゆめは じぶんだけの ほうせき
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              あなたが かいた ゆめは、あなただけのものです。<br/>
              ほかのひとに かってに 見られたり、<br/>
              どこかに いっちゃったり しないように、<br/>
              しっかり まもられています。
            </p>
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
                  <h4 className="font-bold text-base mb-1">アカウントをさくじょする</h4>
                  <p className="text-xs text-muted-foreground">
                    これまでの ゆめが すべて きえてしまいます。<br/>
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
                  <h3 className="font-bold text-lg">おとなのひとに<br/>きいてみてね</h3>
                  <p className="text-sm text-muted-foreground">
                    これは つぎに すすむための カギです。<br/>
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
                  <h3 className="font-bold text-lg text-destructive">ほんとうに けしますか？</h3>
                  <p className="text-sm text-muted-foreground">
                    アカウントを さくじょすると、<br/>
                    これまでの ゆめ日記が<br/>
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
                    {isDeleting ? "さくじょ中..." : "はい、すべて さくじょします"}
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
