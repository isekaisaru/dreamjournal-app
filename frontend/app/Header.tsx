import HeaderLogo from "./components/HeaderLogo";
import AuthNav from "./components/AuthNav";
import ThemeToggle from "./components/ThemeToggle";

// クロスドメイン環境（Vercel × Render）では、Server側でCookieを読めないため、
// 認証状態の取得はAuthNav内のAuthContextで行う。
// 将来の同一ドメイン化時にServer Componentに戻す場合は、
// getServerAuthを使って認証状態を取得し、propsとして渡す。

export default function Header() {
  return (
    <header className="py-3 px-4 sm:px-6 border-b border-border bg-background text-foreground flex flex-col md:flex-row items-center gap-4 md:gap-8">
      <div className="flex-shrink-0">
        <HeaderLogo />
      </div>
      <div className="w-full flex-grow">
        <AuthNav />
      </div>
      {/* テーマ切り替え */}
      <div className="flex-shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
