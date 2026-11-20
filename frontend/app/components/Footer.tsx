import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  // 夢の内容やお支払いの相談は公開の場に書かせない。問い合わせ先メールが未設定のあいだは特商法ページへ。
  const contactHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : "/tokushoho";

  return (
    <footer className="border-t border-border bg-muted/40 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© {currentYear} YumeTree</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            利用規約
          </Link>
          <Link href="/tokushoho" className="hover:text-foreground transition-colors">
            特定商取引法に基づく表記
          </Link>
          <a href={contactHref} className="hover:text-foreground transition-colors">
            お問い合わせ
          </a>
        </div>
      </div>
    </footer>
  );
}
