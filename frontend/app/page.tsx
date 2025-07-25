// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loading from "./loading";

export default function IndexPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 認証状態のチェックが完了するまで待つ

    if (isLoggedIn === null) {
      return;
    }

    // ログイン状態に応じて適切なページにリダイレクト
    router.replace(isLoggedIn ? "/home" : "/trial");
  }, [isLoggedIn, router]);
  // リダイレクトが完了するまでの間、ローディング画面を表示
  return <Loading />;
}
