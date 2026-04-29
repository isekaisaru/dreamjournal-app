"use client";

import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";

import MorpheusHero from "./MorpheusHero";

type MorpheusLoginRequiredProps = {
  title?: string;
  message?: string;
};

export default function MorpheusLoginRequired({
  title = "モルペウスが入口で待っているよ",
  message = "ここから先は、あなたの夢を安全にしまっておく場所です。ログインすると、夢の記録やふりかえりを続きから見られます。",
}: MorpheusLoginRequiredProps) {
  return (
    <main className="min-h-[calc(100vh-6rem)] bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <MorpheusHero
          expression="cheerful"
          imageVariant="login"
          variant="detail"
          size={168}
          title={title}
          message={message}
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LockKeyhole className="h-4 w-4" />
                ログインする
              </Link>
              <Link
                href="/trial"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background/85 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Sparkles className="h-4 w-4" />
                まず試してみる
              </Link>
            </div>
          }
        />
      </div>
    </main>
  );
}
