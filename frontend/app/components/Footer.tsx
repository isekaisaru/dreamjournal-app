import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/40 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© {currentYear} YumeTree</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            利用規約
          </Link>
          <a
            href="https://github.com/isekaisaru/dreamjournal-app/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            お問い合わせ
          </a>
        </div>
      </div>
    </footer>
  );
}
