"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Trees, Moon, Settings, type LucideIcon } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import DreamEntryLauncher from "./DreamEntryLauncher";

type Tab = { href: string; label: string; icon: LucideIcon };

const LEFT_TABS: Tab[] = [
  { href: "/home", label: "おうち", icon: House },
  { href: "/forest", label: "もり", icon: Trees },
];
const RIGHT_TABS: Tab[] = [
  { href: "/my-dreams", label: "マイ夢", icon: Moon },
  { href: "/settings", label: "設定", icon: Settings },
];

/**
 * モバイル専用のボトムタブバー。ログイン時だけ表示し、中央に記録FAB（DreamEntryLauncher）を置く。
 * デスクトップ（md以上）は現行Headerに任せるため md:hidden。
 * nav には backdrop-filter / transform を付けない（DreamEntryLauncherの fixed モーダルを壊さないため）。
 */
export default function BottomTabBar(): React.JSX.Element | null {
  const pathname = usePathname();
  const { authStatus, isLoggedIn } = useAuth();

  if (authStatus === "checking" || !isLoggedIn) return null;

  const renderTab = ({ href, label, icon: Icon }: Tab) => {
    const active =
      pathname === href || (href !== "/" && (pathname?.startsWith(href) ?? false));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon size={22} aria-hidden />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* コンテンツがバーに隠れないようにする下スペーサー（ログイン時・モバイルのみ） */}
      <div
        aria-hidden
        className="h-[calc(env(safe-area-inset-bottom)+4.5rem)] md:hidden"
      />
      <nav
        aria-label="メインナビゲーション"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {LEFT_TABS.map(renderTab)}

        <div className="flex flex-1 items-start justify-center">
          <DreamEntryLauncher
            buttonLabel="夢をきろくする"
            buttonClassName="-mt-6 h-14 w-14 justify-center rounded-full bg-primary text-primary-foreground shadow-lg [&>span]:sr-only"
            showSparkles
          />
        </div>

        {RIGHT_TABS.map(renderTab)}
      </nav>
    </>
  );
}
