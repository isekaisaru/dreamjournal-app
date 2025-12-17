import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import { getServerAuth } from "@/lib/server-auth";
import AuthNav from "./components/AuthNav";

export default async function Header() {
  const { isAuthenticated } = await getServerAuth();

  return (
    <header className="py-3 px-4 sm:px-6 border-b border-border bg-background text-foreground flex flex-col md:flex-row items-center gap-4 md:gap-8">
      <div className="flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-primary hover:text-primary/90 transition-opacity"
        >
          <Moon className="text-blue-300" size={32} />
          <span className="text-2xl font-extrabold tracking-tight">ユメログ</span>
          <Sparkles className="text-yellow-300" size={24} />
        </Link>
      </div>
      <div className="w-full flex-grow">
        <AuthNav isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
