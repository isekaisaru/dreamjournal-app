"use client";

import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderLogo() {
  const { authStatus } = useAuth();
  // "unauthenticated" のみ / に向ける。
  // "checking" 中はプロテクトページにいる可能性が高いので /home に向けることで
  // 認証完了前のクリックでも二段ジャンプを起こさない。
  const href = authStatus === "unauthenticated" ? "/" : "/home";

  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-primary hover:text-primary/90 transition-opacity"
    >
      <Moon className="text-blue-300" size={32} />
      <span className="text-2xl font-extrabold tracking-tight">ユメログ</span>
      <Sparkles className="text-yellow-300" size={24} />
    </Link>
  );
}
