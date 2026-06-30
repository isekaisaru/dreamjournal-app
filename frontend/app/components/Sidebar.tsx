"use client";

/**
 * Sidebar — デスクトップ常設の左ナビゲーション（redesign-code STEP 4 / 改善①）
 *
 * lg+ かつログイン時のみ表示。PCではこのサイドバーが logo＋ナビ＋ユーザー＋
 * テーマ＋ログアウトを担い、既存Header（横長）は隠す（body.has-sidebar + CSS）。
 * モバイル・未ログイン・公開ページでは何も描画せず、従来のHeader/BottomTabBarに任せる。
 */

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, Moon, Search, Settings, Trees } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { toast } from "@/lib/toast";
import { useCommandPalette } from "./CommandPalette";
import ThemeToggle from "./ThemeToggle";

type NavItem = { href: string; label: string; icon: typeof Home };

const NAV: NavItem[] = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/forest", label: "夢の森", icon: Trees },
  { href: "/my-dreams", label: "マイ夢", icon: Moon },
  { href: "/settings", label: "設定", icon: Settings },
];

function navClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-primary/10 font-bold text-primary"
      : "font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  ].join(" ");
}

export default function Sidebar() {
  const pathname = usePathname() ?? "";
  const { isLoggedIn, user, logout } = useAuth();
  const palette = useCommandPalette();

  const show = isLoggedIn;

  useEffect(() => {
    if (!show) return;
    document.body.classList.add("has-sidebar");
    return () => {
      document.body.classList.remove("has-sidebar");
    };
  }, [show]);

  if (!show) return null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "おしまいに できませんでした。"
      );
    }
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <Link
        href="/home"
        className="mb-6 flex items-center gap-2.5 px-2 text-lg font-black text-foreground"
      >
        <span aria-hidden="true" className="text-xl">
          🌙
        </span>
        ユメツリー
      </Link>

      <nav className="flex flex-col gap-1" aria-label="サイドナビゲーション">
        <Link
          href={NAV[0].href}
          aria-current={isActive(NAV[0].href) ? "page" : undefined}
          className={navClass(isActive(NAV[0].href))}
        >
          <Home size={19} strokeWidth={isActive(NAV[0].href) ? 2.2 : 2} />
          {NAV[0].label}
        </Link>

        {/* さがす = コマンドパレット起動 */}
        <button
          type="button"
          onClick={() => palette.open()}
          className={`${navClass(false)} w-full`}
        >
          <Search size={19} strokeWidth={2} />
          さがす
          <kbd className="ml-auto rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {NAV.slice(1).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navClass(active)}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/40 p-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-primary text-sm font-bold text-white">
            {(user?.username ?? "ゆ").slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-foreground">
              {user?.username ?? "ゲスト"}さん
            </div>
            {user?.premium ? (
              <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                ✦ プレミアム
              </div>
            ) : (
              <div className="text-[10px] font-medium text-muted-foreground">
                無料プラン
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </div>
    </aside>
  );
}
