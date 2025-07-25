import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { getServerAuth } from "@/lib/server-auth";
import AuthNav from "./components/AuthNav";

export default async function Header() {
  const { user, isAuthenticated } = await getServerAuth();

  return (
    <header className="py-5 px-4 sm:px-6 md:px-10 border-b border-border bg-background text-foreground flex flex-col sm:flex-row justify-between items-center">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          <Link href="/" className="text-primary hover:text-primary/90">
            ユメログ
          </Link>
        </h1>
      </div>
      <div>
        <AuthNav user={user} isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
}
