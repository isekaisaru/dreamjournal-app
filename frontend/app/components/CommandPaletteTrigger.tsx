"use client";

import { Search } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useCommandPalette } from "./CommandPalette";

/**
 * コマンドパレットの見える起動口（デスクトップ用）。
 * ⌘K はキーボード操作なので、マウス派・発見性のために md+ で小さな検索ボタンを出す。
 * モバイルは既存導線（ボトムバー/検索）で足りるため非表示。認証時のみ表示。
 */
export default function CommandPaletteTrigger() {
  const { isLoggedIn } = useAuth();
  const palette = useCommandPalette();

  if (!isLoggedIn) return null;

  return (
    <button
      type="button"
      onClick={() => palette.open()}
      aria-label="コマンドパレットを開く"
      className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search size={16} />
      <span>検索</span>
      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
        ⌘K
      </kbd>
    </button>
  );
}
