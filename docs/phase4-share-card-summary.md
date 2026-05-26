# Phase 4「夢画像シェアカード」実装まとめ

## 1. Phase 4 概要

AI生成画像をSNSや友人にシェアできる「夢画像シェアカード」機能を実装した。
フロントエンド完結のPNG書き出し・URLコピー・期限切れ画像フォールバック・CORS回避プロキシを組み合わせ、
本番環境（Vercel + Render + DALL-E 3 CDN）の制約に合わせた設計になっている。

**PR履歴:**

| PR | 内容 |
|----|------|
| #293 | シェアカードUI（DreamShareCardコンポーネント新規作成） |
| #294 | 画像プロキシAPIルート（`/api/image-proxy`）新規作成 |
| #295 | PNG保存機能（html-to-image + Web Share API / `<a download>`） |
| #296 | リンクコピー機能（`navigator.clipboard.writeText`） |
| #297 | data:image URL対応と画像の二重表示を解消 |
| #308 | 操作ボタンにlucide-reactアイコン追加（Link / Download） |

---

## 2. ユーザーにとってのメリット

- **AI占い画像をそのままPNGで保存**できる（スクリーンショット不要）
- **SNSシェア用のURLをワンタップでコピー**できる
- **画像URLが期限切れになっても、分かりやすいエラーメッセージ**が表示されてフリーズしない
- iOSではWeb Share APIで写真アプリに直接保存できる

---

## 3. 実装した機能

### 3-1. シェアカード表示

`DreamShareCard` コンポーネント（`frontend/app/components/DreamShareCard.tsx`）に、
AI生成画像・タイトル・記録日・感情タグを組み合わせたカードを実装した。

```tsx
<DreamShareCard
  imageUrl={generatedImageUrl}
  title={dream.title}
  recordedAt={dream.created_at}
  emotionLabels={displayTags}
  imageAlt={copy.imageAlt}
  onImageError={handleImageLoadError}
/>
```

### 3-2. PNGとして保存

`html-to-image` の `toPng()` でDOMサブツリーをPNGに変換する。
iOS Safari では `navigator.share({ files: [file] })` でネイティブシェアシートを使用し、
それ以外（PC / Android Chrome）は `<a download>` にフォールバックする。

```typescript
// iOS Safari: Web Share API
if (navigator.share && navigator.canShare({ files: [file] })) {
  await navigator.share({ files: [file] });
  return;
}
// PC / Android: <a download>
const a = document.createElement("a");
a.href = dataUrl;
a.download = filename;
a.click();
```

AbortError（ユーザーがシェアシートをキャンセル）は `<a download>` にフォールバックしない。

### 3-3. リンクコピー

`navigator.clipboard.writeText(window.location.href)` で現在のURLをクリップボードにコピー。
未対応ブラウザは try/catch でエラートースト表示にフォールバックする。

### 3-4. 画像を1か所だけに表示（重複解消）

以前は `page.tsx` に単独の `<Image>` と `DreamShareCard` 内の `<Image>` が二重に存在していた。
`page.tsx` から単独の `<Image>` を削除し、`DreamShareCard` を画像表示の唯一のエントリーポイントにした。

### 3-5. 操作ボタンにアイコン追加

`lucide-react` の `Link`（リンクコピー）と `Download`（画像保存）を追加した。
アイコンには `aria-hidden="true"` を付与してスクリーンリーダーの二重読み上げを防ぐ。

```tsx
<Link size={15} aria-hidden="true" />
<Download size={15} aria-hidden="true" />
```

### 3-6. data:image URL のセーフリスト対応

DALL-E 3 の画像は通常 `https://oaidalleapiprodscus.blob.core.windows.net/...` だが、
将来的に base64 data:image を受け取るケースにも対応するため、
安全な MIME タイプのみを明示的に許可する `SAFE_DATA_PREFIXES` を定義した。

```typescript
const SAFE_DATA_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/webp;base64,",
] as const;
```

`data:image/svg+xml`、`text/html`、`javascript:`、`blob:` はすべて拒否し、エラートーストを表示する。

### 3-7. 期限切れ画像URLのフォールバック

DALL-E 3 の画像URLは有効期限があり、ページを長期間開いたままにしていると画像が読み込めなくなる。
`<Image onError>` → `onImageError` prop → `handleImageLoadError` の経路でエラーを検知し、
URLをクリアして日本語のエラーメッセージを表示する。

```typescript
const handleImageLoadError = () => {
  const isRemoteBlobUrl =
    typeof generatedImageUrl === "string" &&
    generatedImageUrl.startsWith(
      "https://oaidalleapiprodscus.blob.core.windows.net/"
    );
  setImageError(
    isRemoteBlobUrl
      ? "ほぞんずみ の ゆめのえ の きげん が きれました。もういちど かいてみてください。"
      : "ゆめのえ を ひょうじ できませんでした。"
  );
  setGeneratedImageUrl(null);
};
```

---

## 4. 技術的工夫

### 4-1. html-to-image `toPng()`

DOMサブツリーを canvas にシリアライズしてPNGを生成する。
外部スクリプトは不要でサーバー負荷ゼロ、ユーザーデータが外部に送信されないという利点がある。

### 4-2. `/api/image-proxy` APIルート

`toPng()` はクロスオリジンの画像を読み込むと **tainted canvas** になりピクセルデータを取得できない。
DALL-E 3 のCDN（`oaidalleapiprodscus.blob.core.windows.net`）は CORS ヘッダーを返さないため、
Next.js の API Route（`frontend/app/api/image-proxy/route.ts`）でサーバーサイドから画像をフェッチし、
同一オリジンのレスポンスとしてブラウザに返すことでこの問題を回避した。

### 4-3. CORS / tainted canvas 回避

```
ブラウザ → /api/image-proxy（同一オリジン） → DALL-E CDN
                                          ← blob を返す
ブラウザ ← blob URL（同一オリジン）
```

blob URLを一時的に `img.src` に差し替えて `toPng()` を実行し、完了後に元のURLへ戻す。

### 4-4. SSRF対策

プロキシが悪用されないよう以下の対策を実装している。

| 対策 | 内容 |
|------|------|
| `ALLOWED_HOSTS` | `oaidalleapiprodscus.blob.core.windows.net` のみ許可 |
| `isPrivateOrLocalhost()` | プライベートIP（10.x, 172.16-31.x, 192.168.x, 127.x, ::1）をブロック |
| `redirect: "error"` | Fetchオプションでリダイレクト追跡を禁止（リダイレクト経由のSSRF防止） |
| https-only | httpスキームのURLを拒否 |

### 4-5. data:image vs https の分岐処理

```typescript
if (SAFE_DATA_PREFIXES.some((p) => imageUrl.startsWith(p))) {
  // png / jpeg / webp base64 → proxy不要、tainted canvasも発生しない
  await waitForImageReady(img);
} else if (imageUrl.startsWith("https://")) {
  // DALL-E 3 URL → プロキシ経由でblob URLに差し替え
  const res = await fetch(proxyUrl);
  const blob = await res.blob();
  objectUrl = URL.createObjectURL(blob);
  img.src = objectUrl;
  await waitForImageReady(img);
} else {
  throw new Error("unsupported image URL scheme");
}
```

### 4-6. `waitForImageReady`

`img.decode()` → `img.complete && naturalWidth > 0` → `onload` の順でフォールバックし、
画像が描画可能になってから `toPng()` を呼ぶことでブランク PNG の生成を防ぐ。

```typescript
async function waitForImageReady(img: HTMLImageElement): Promise<void> {
  if (typeof img.decode === "function") {
    await img.decode();
    return;
  }
  if (img.complete && img.naturalWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("image load failed"));
  });
}
```

### 4-7. `onImageError` によるURLフォールバック

`DreamShareCard` は `onImageError?: () => void` prop を受け取り `<Image onError>` にバインドする。
コンポーネント自身はURL管理をせず、エラー処理を親（`page.tsx`）に委譲する設計にした。

---

## 5. プライバシー設計

### 5-1. 夢の内容はカードに含めない

`DreamShareCard` は `title`・`recordedAt`・`emotionLabels`・`imageUrl` のみを受け取る。
夢の本文（`content`）・AI分析テキスト（`analysis_json.analysis`）は渡さない。
SNSシェア時にセンシティブな内容が公開されるリスクを構造レベルで排除している。

### 5-2. 操作ボタンはPNGに含まない

`<section ref={cardRef}>` をシリアライズ対象にし、「リンクをコピー」「画像として保存」ボタンは
`section` の外に配置する。これによりPNGにはカード本体だけが含まれる。

```tsx
<section ref={cardRef} data-testid="dream-share-card">
  {/* PNG に含まれるカード本体 */}
</section>

{/* PNG に含まれないボタン */}
<div className="mt-3 flex flex-wrap justify-end gap-2">
  <button onClick={handleCopyLink}>...</button>
  <button onClick={handleSave}>...</button>
</div>
```

---

## 6. テストカバレッジ

| テストファイル | テスト数 | 主なカバー範囲 |
|---------------|---------|---------------|
| `__tests__/components/DreamShareCard.test.tsx` | 28 | PNG保存・リンクコピー・URLスキーム分岐・img.src復元・エラートースト |
| `__tests__/components/DreamDetailPage.test.tsx` | 3 | 画像二重表示なし・生成ボタン表示 |
| `__tests__/context/AuthContext.test.tsx` | 24 | 401/403/404/500恒久的エラー・502/503/504/networkリトライ・リトライ上限 |
| **合計** | **131** | フルスイート |

### DreamShareCard の主要テストケース

```
URLの種類による分岐
  ✓ data:image/png;base64 → fetchを呼ばず成功トースト
  ✓ https → プロキシfetchが呼ばれる
  ✓ ftp: / data:image/svg+xml / blob: / javascript: → エラートースト・toPng未呼び出し
  ✓ プロキシfetch失敗時はimg.srcを元のURLに戻す
```

**TypeScript:** コンパイルエラーゼロ（`yarn tsc --noEmit`）
**Playwright E2E:** 夢詳細フローの7テストすべてパス（ `data-testid="dream-share-card"` でセレクタを安定化）

---

## 7. 面談用 30 秒説明

「AI生成した夢の画像を、ユーザーが直接スマホやPCに保存できる機能を実装しました。
技術的な課題は、外部CDNの画像を Canvas でピクセル読み取りしようとすると
ブラウザの tainted canvas エラーが発生することでした。
これを解決するため、Next.js の API Route を画像プロキシとして実装し、
DALL-E の画像をサーバーサイドで取得して同一オリジンとしてブラウザに返すことで、
クライアント完結のPNG書き出しを実現しました。
プロキシにはSSRF対策（ホスト名の許可リスト・プライベートIP遮断・リダイレクト禁止）も実装しています。」

---

## 8. 職務経歴書実績文

- Next.js App Routerを用いてAI生成画像のシェアカード機能を実装。html-to-imageによるクライアントサイドPNG書き出し、CORS/tainted canvas回避のための画像プロキシAPIルート（SSRF対策含む）、iOSのWeb Share API対応など、ブラウザ固有の制約を複数解決した。
- 認証コンテキスト（AuthContext）のエラーハンドリングを改善。Renderのfreeティアによるスリープ起動時の502/503エラーを一時障害として識別し、最大3回・6秒間隔のリトライ機構を実装。従来は一時的な通信エラーでもユーザーが強制ログアウト扱いになっていた問題を解消した。

---

*最終更新: 2026-05-25*
