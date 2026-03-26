"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

/**
 * ダーク / ライトモード切り替えボタン
 * Header 内に配置するクライアントコンポーネント
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "ライトモードにする" : "ダークモードにする"}
      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={theme === "dark" ? "☀️ ひるのモード" : "🌙 よるのモード"}
    >
      {theme === "dark" ? (
        <Sun size={20} className="text-yellow-300" />
      ) : (
        <Moon size={20} className="text-blue-500" />
      )}
    </button>
  );
}
