import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { getServerAuth } from "@/lib/server-auth";

type PageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

function renderErrorState(message: string) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            決済を確認できませんでした
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            {message}
          </p>
          <Link
            href="/subscription"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            プランページへ戻る
          </Link>
        </section>
      </main>
    </div>
  );
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;
  const { isAuthenticated, token } = await getServerAuth();

  if (!isAuthenticated || !token) {
    // Try refreshing before forcing /login — access_token may have expired
    // during Stripe checkout while a valid refresh_token still exists.
    const cookieStore = await cookies();
    const hasRefreshToken = !!cookieStore.get("refresh_token")?.value;
    const currentPath = sessionId
      ? `/subscription/success?session_id=${encodeURIComponent(sessionId)}`
      : "/subscription/success";
    if (hasRefreshToken) {
      redirect(
        `/api/auth/refresh?redirect=${encodeURIComponent(currentPath)}`
      );
    }
    redirect("/login");
  }

  if (!sessionId) {
    return renderErrorState("Stripe の session_id が見つかりませんでした。");
  }

  try {
    await apiFetch<{ verified: boolean }>(
      `/checkout/session?session_id=${encodeURIComponent(sessionId)}`,
      { token }
    );
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "決済確認中にエラーが発生しました。時間をおいて再度ご確認ください。";
    return renderErrorState(message);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <section className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            プレミアム会員になりました！✨
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Stripe の決済を確認しました。プレミアム反映まで数秒かかる場合があります。
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
