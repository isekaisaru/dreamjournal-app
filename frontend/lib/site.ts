/**
 * サイト全体で共有する公開URL・SEO関連の定数。
 *
 * これまで layout / sitemap / robots に本番URLが個別ハードコードされていたため、
 * 独自ドメイン移行時の取りこぼしや canonical 不整合を防ぐ目的で一元化する。
 * 環境変数 NEXT_PUBLIC_SITE_URL があればそれを優先し、無ければ本番Vercel URLにフォールバックする。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dreamjournal-app.vercel.app"
).replace(/\/$/, "");

/**
 * 認証が必要・裏方・決済リダイレクトなど、検索エンジンにクロール/インデックスさせたくないパス接頭辞。
 * robots.txt の disallow と整合させ、新しい認証ページを追加したらここに足す。
 */
export const NON_INDEXABLE_PATH_PREFIXES = [
  "/api/", // APIエンドポイント
  "/home", // ログイン後トップ
  "/dream", // 夢の詳細・新規・月別（ユーザーデータ）
  "/my-dreams", // 夢一覧（ユーザーデータ）
  "/insights", // きもちインサイト（認証）
  "/forest", // 夢の森（認証）
  "/room", // 夢の部屋（認証）
  "/profiles", // プロフィール（認証）
  "/settings", // 設定（認証）
  "/subscription", // サブスク管理・決済リダイレクト（認証）
  "/verify-email", // メールアドレス確認（トークン付きリンク・公開だが個別URL）
  "/debug", // 開発用デバッグページ
] as const;

/**
 * 問い合わせ先のメールアドレス。特定商取引法に基づく表記・プライバシーポリシー・フッターで共通に使う。
 * 特商法の表記では販売事業者の情報を「請求があれば遅滞なく開示」にしているため、
 * 請求を受け付けるこのアドレスが実在することが前提（__tests__/lib/site.test.ts で空・架空を止める）。
 * TODO: 運営者が専用アドレスを用意したら設定する（それまでは画面に「準備中」と出る）。
 */
export const SUPPORT_EMAIL: string = "";

/**
 * Google Search Console の HTMLタグ検証用トークン（任意）。
 * Search Console で発行された値を環境変数に設定すると <meta name="google-site-verification"> が出力される。
 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
