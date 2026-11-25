// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "./lib/sentryPrivacyOptions";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 機密情報の保護(送信前の整形・トランザクション/ログ/メトリクスを送らない設定)。
  // 詳細は lib/sentryPrivacyOptions.ts。3つの Sentry 設定ファイルが同じ値を使う。
  ...sentryPrivacyOptions,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
