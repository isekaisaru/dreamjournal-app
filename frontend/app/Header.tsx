import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import { getServerAuth } from "@/lib/server-auth";
import AuthNav from "./components/AuthNav";

export default async function Header() {
  const { isAuthenticated } = await getServerAuth();

  return (
    <header className="py-5 px-4 sm:px-6 md:px-10 border-b border-border bg-background text-foreground flex flex-col sm:flex-row justify-between items-center">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary hover:text-primary/90"
          >
            <Moon className="text-blue-300" size={28} />
            ユメログ
            <Sparkles className="text-yellow-300" size={20} />
          </Link>
        </h1>
      </div>
      <div>
        <AuthNav isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
