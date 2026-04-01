import Link from "next/link";

export default function SubscriptionCancelPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            またいつでも待っています 🌙
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            気が向いたときにプレミアムをお試しください
          </p>
          <Link
            href="/subscription"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            プランを見る
          </Link>
        </section>
      </main>
    </div>
  );
}
