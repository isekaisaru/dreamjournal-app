"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { toast } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";
import {
  House,
  Pencil,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Loader2,
} from "lucide-react";

// AuthContextを使用するため、propsは不要
// 将来の同一ドメイン化時にServer Componentに戻す場合に備えて、
// interfaceは残しておく（使用時にコメントを外す）
// interface AuthNavProps {
//   isAuthenticated?: boolean;
// }

export default function AuthNav() {
  const pathname = usePathname();

  // クロスドメイン環境ではServer側でCookieを読めないため、
  // AuthContextで認証状態を取得する
  const { authStatus, isLoggedIn, logout } = useAuth();

  // AuthContextの状態を優先使用
  const isAuthenticated = isLoggedIn;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error: any) {
      toast.error(error.message || "おしまいに できませんでした。");
    }
  };

  const NavItem = ({
    href,
    icon: Icon,
    label,
    variant = "default",
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
    variant?: "default" | "admin";
  }) => {
    const isActive =
      pathname === href || (href !== "/" && pathname?.startsWith(href));
    // おとなのきまり（admin）は少し目立たなく、通常（default）は子ども向けにわかりやすく
    const activeStyle =
      variant === "default"
        ? "bg-primary/15 text-primary font-bold shadow-sm ring-1 ring-primary/20"
        : "bg-muted text-foreground font-semibold";

    const inactiveStyle =
      variant === "default"
        ? "text-muted-foreground hover:bg-muted hover:text-foreground"
        : "text-muted-foreground hover:text-foreground";

    return (
      <Link href={href}>
        <div
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 ${
            isActive ? activeStyle : inactiveStyle
          }`}
        >
          <Icon size={variant === "default" ? 20 : 18} />
          <span className={variant === "default" ? "text-sm" : "text-xs"}>
            {label}
          </span>
        </div>
      </Link>
    );
  };

  // 認証確認中はローディング表示
  if (authStatus === "checking") {
    return (
      <nav className="flex justify-center md:justify-end gap-3 w-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">かくにんちゅう…</span>
        </div>
      </nav>
    );
  }

  if (!isAuthenticated) {
    return (
      <nav className="flex justify-center md:justify-end gap-3 w-full">
        <Link href="/login">
          <Button variant="ghost" className="gap-2">
            <LogIn size={18} /> ログイン
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary" className="gap-2">
            <UserPlus size={18} /> ユーザー登録
          </Button>
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex flex-col md:flex-row items-center justify-between w-full h-full gap-4 md:gap-0">
      {/* 行動（左側）：毎日つかうもの */}
      <div className="flex items-center bg-secondary/30 p-1 rounded-full gap-1">
        <NavItem href="/" icon={House} label="おうち" />
        <NavItem href="/dream/new" icon={Pencil} label="ゆめをかく" />
      </div>

      {/* 管理（右側）：おわり・設定 */}
      <div className="flex items-center gap-2 md:ml-auto">
        <NavItem
          href="/settings"
          icon={Settings}
          label="おとなのきまり"
          variant="admin"
        />

        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive gap-1.5 rounded-full px-3"
        >
          <LogOut size={18} />
          <span className="text-xs">おしまい</span>
        </Button>
      </div>
    </nav>
  );
}
