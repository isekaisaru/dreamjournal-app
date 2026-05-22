// Sentry OpenTelemetry との互換性のため、Node.js Runtime を使用
export const runtime = "nodejs";

// SSRF対策: 許可するホスト一覧
// generated_image_url で実際に使用されるOpenAI画像CDNのドメインのみ許可する
// 参照: frontend/app/dream/[id]/page.tsx の isOpenAiImage 判定ロジック
const ALLOWED_HOSTS = new Set([
  "oaidalleapiprodscus.blob.core.windows.net",
]);

// SSRF対策: プライベートIP・localhost・リンクローカルを拒否する
function isPrivateOrLocalhost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "[::1]" ||
    h.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h) ||
    h.startsWith("192.168.") ||
    h.startsWith("169.254.") ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)
  );
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return new Response("Only https URLs are allowed", { status: 403 });
  }

  if (isPrivateOrLocalhost(parsed.hostname)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: { Accept: "image/*" },
    });

    if (!upstream.ok) {
      return new Response("Failed to fetch image", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    const safeContentType = contentType.startsWith("image/")
      ? contentType
      : "image/png";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": safeContentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
