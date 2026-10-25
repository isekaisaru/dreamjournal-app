import HeaderLogo from "./components/HeaderLogo";
import AuthNav from "./components/AuthNav";
import ThemeToggle from "./components/ThemeToggle";
import CommandPaletteTrigger from "./components/CommandPaletteTrigger";

// クロスドメイン環境（Vercel × Render）では、Server側でCookieを読めないため、
// 認証状態の取得はAuthNav内のAuthContextで行う。
// 将来の同一ドメイン化時にServer Componentに戻す場合は、
// getServerAuthを使って認証状態を取得し、propsとして渡す。

export default function Header() {
  return (
    <header
      data-app-header
      className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-3 text-foreground sm:px-6 md:flex-nowrap md:gap-8"
    >
      <div className="flex-shrink-0">
        <HeaderLogo />
      </div>
      <div
        data-auth-navigation
        className="order-3 w-full flex-grow md:order-none"
      >
        <AuthNav />
      </div>
      {/* ⌘K コマンドパレットの起動口（デスクトップのみ） */}
      <div className="flex-shrink-0">
        <CommandPaletteTrigger />
      </div>
      {/* テーマ切り替え */}
      <div className="flex-shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
