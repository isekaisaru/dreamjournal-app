import Link from "next/link";

export default function SubscriptionSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            プレミアム会員になりました！✨
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            月額課金が開始されました。すべての機能をお楽しみください
          </p>
          <Link
            href="/home"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            夢日記を始める
          </Link>
        </section>
      </main>
    </div>
  );
}
