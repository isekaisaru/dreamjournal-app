/**
 * Sentry の `init` に渡す、機密情報保護の共通オプション。
 * ブラウザ(instrumentation-client.ts)・Node.js(sentry.server.config.ts)・Edge(sentry.edge.config.ts)の
 * 3か所が同じ値を使う。どれか1つだけ付け忘れる事故を防ぐため、1つのオブジェクトにまとめている。
 *
 * 方針(「送るものを増やさず、安全に減らす」):
 * - エラーイベントは、許可リスト方式の `sanitizeEvent` を通した形だけ送る(失敗したら送らない)。
 * - パンくずは、収集した時点で `sanitizeBreadcrumb` を通す。
 * - トランザクション(計測)・ログ・メトリクスは、保護の方法が決まるまで送らない。
 *   URL(パスワード再設定のトークンなど)や本文が入りうるため。計測を止める代わりに、
 *   無駄な計測データを作らないよう `tracesSampleRate` も 0 にする。
 *   アプリは `Sentry.logger` を使っていないので、`enableLogs: false` で失うものはない。
 * - `sendDefaultPii` は false。ただしこの設定だけでは、Next.js サーバーのエラーに付く
 *   Cookie・Authorization・リクエスト本文は止まらない(@sentry/nextjs 10.75.2 で実測)。
 *   それらは `sanitizeEvent` の許可リストで取り除く。
 *
 * `@sentry/nextjs` は型だけを import する(実行時には何も読み込まない)。
 */
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { sanitizeBreadcrumb, sanitizeEvent } from "./sentryPrivacy";

export const sentryPrivacyOptions = {
  sendDefaultPii: false,
  enableLogs: false,
  tracesSampleRate: 0,
  beforeSend: (event: ErrorEvent): ErrorEvent | null => sanitizeEvent(event),
  beforeBreadcrumb: (breadcrumb: Breadcrumb): Breadcrumb | null =>
    sanitizeBreadcrumb(breadcrumb),
  beforeSendTransaction: (): null => null,
  beforeSendLog: (): null => null,
  beforeSendMetric: (): null => null,
} as const;
