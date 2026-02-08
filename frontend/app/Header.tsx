import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import AuthNav from "./components/AuthNav";

// クロスドメイン環境（Vercel × Render）では、Server側でCookieを読めないため、
// 認証状態の取得はAuthNav内のAuthContextで行う。
// 将来の同一ドメイン化時にServer Componentに戻す場合は、
// getServerAuthを使って認証状態を取得し、propsとして渡す。

export default function Header() {
  return (
    <header className="py-3 px-4 sm:px-6 border-b border-border bg-background text-foreground flex flex-col md:flex-row items-center gap-4 md:gap-8">
      <div className="flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-primary hover:text-primary/90 transition-opacity"
        >
          <Moon className="text-blue-300" size={32} />
          <span className="text-2xl font-extrabold tracking-tight">
            ユメログ
          </span>
          <Sparkles className="text-yellow-300" size={24} />
        </Link>
      </div>
      <div className="w-full flex-grow">
        <AuthNav />
      </div>
    </header>
  );
}
