/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { sentryPrivacyOptions } from "@/lib/sentryPrivacyOptions";

// Sentry へは何も送らない。`init` に渡された設定を記録するだけの差し替え。
jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
  captureRouterTransitionStart: jest.fn(),
  captureRequestError: jest.fn(),
}));

// ここに出てくる値はすべて架空のダミーです。実在のトークン・メール・夢本文は使いません。
const S = {
  resetToken: "RESETTOKEN_dummy_Zx81QpLm44aa90bbCc77",
  email: "dummy.user@example.invalid",
  dream: "ゆうべの夢でダミーのくじらと空を飛んだ",
  cookie: "access_token=DUMMY_COOKIE_VALUE_456",
  bearer: "Bearer DUMMY_BEARER_VALUE_123",
};
const FORBIDDEN = [
  S.resetToken,
  S.email,
  S.dream,
  "DUMMY_COOKIE_VALUE_456",
  "DUMMY_BEARER_VALUE_123",
];

function expectNoSecrets(output: unknown) {
  const text = JSON.stringify(output);
  for (const fragment of FORBIDDEN) {
    expect(text).not.toContain(fragment);
  }
}

function rawErrorEvent(): any {
  return {
    event_id: "0123456789abcdef0123456789abcdef",
    level: "error",
    platform: "javascript",
    transaction: `/password-reset/${S.resetToken}`,
    message: `failed for ${S.email}`,
    user: { email: S.email },
    extra: { dream: S.dream },
    request: {
      url: `https://app.example.invalid/password-reset/${S.resetToken}?token=${S.resetToken}`,
      method: "GET",
      headers: { Cookie: S.cookie, Authorization: S.bearer },
      cookies: { access_token: "DUMMY_COOKIE_VALUE_456" },
    },
    exception: {
      values: [{ type: "Error", value: `API response: ${S.dream}` }],
    },
    breadcrumbs: [
      { category: "console", message: S.dream },
      {
        category: "fetch",
        data: {
          url: `https://api.example.invalid/password_resets/${S.resetToken}`,
          method: "POST",
          status_code: 200,
        },
      },
    ],
  };
}

describe("sentryPrivacyOptions: 値", () => {
  it("PII の自動送信・ログ・計測(トレース)を止めている", () => {
    expect(sentryPrivacyOptions.sendDefaultPii).toBe(false);
    expect(sentryPrivacyOptions.enableLogs).toBe(false);
    expect(sentryPrivacyOptions.tracesSampleRate).toBe(0);
  });
});

describe("sentryPrivacyOptions: 送信前フック", () => {
  it("beforeSend: エラーイベントから機密情報を取り除く", () => {
    const result: any = sentryPrivacyOptions.beforeSend(rawErrorEvent());
    expect(result).not.toBeNull();
    expectNoSecrets(result);
    expect(result.user).toBeUndefined();
    expect(result.extra).toBeUndefined();
    expect(result.request.headers).toBeUndefined();
    expect(result.request.cookies).toBeUndefined();
    expect(result.request.url).toBe(
      "https://app.example.invalid/password-reset/[token]"
    );
    expect(result.exception.values[0].type).toBe("Error");
    expect(result.exception.values[0].value).toBe("[Filtered message]");
  });

  it("beforeSend: 入力を書き換えない", () => {
    const raw = rawErrorEvent();
    const before = JSON.stringify(raw);
    sentryPrivacyOptions.beforeSend(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it("beforeSend: エラー以外のイベント(transaction)は送らない", () => {
    expect(
      sentryPrivacyOptions.beforeSend({
        ...rawErrorEvent(),
        type: "transaction",
      })
    ).toBeNull();
  });

  it("beforeSend: 解釈できない入力は送らない(null)", () => {
    expect(sentryPrivacyOptions.beforeSend(null as any)).toBeNull();
    expect(sentryPrivacyOptions.beforeSend("text" as any)).toBeNull();
  });

  it("beforeBreadcrumb: console は捨て、fetch の URL はトークンを除く", () => {
    expect(
      sentryPrivacyOptions.beforeBreadcrumb({
        category: "console",
        message: S.dream,
      } as any)
    ).toBeNull();

    const fetchCrumb: any = sentryPrivacyOptions.beforeBreadcrumb({
      category: "fetch",
      data: {
        url: `https://api.example.invalid/password_resets/${S.resetToken}`,
        method: "POST",
      },
    } as any);
    expectNoSecrets(fetchCrumb);
    expect(fetchCrumb.data.url).toBe(
      "https://api.example.invalid/password_resets/[token]"
    );
  });

  it("beforeSendTransaction / beforeSendLog / beforeSendMetric: 何が来ても送らない", () => {
    const anything = { type: "transaction", message: S.dream, name: S.email };
    expect(sentryPrivacyOptions.beforeSendTransaction()).toBeNull();
    expect(
      (sentryPrivacyOptions.beforeSendTransaction as any)(anything)
    ).toBeNull();
    expect((sentryPrivacyOptions.beforeSendLog as any)(anything)).toBeNull();
    expect((sentryPrivacyOptions.beforeSendMetric as any)(anything)).toBeNull();
  });
});

// ブラウザ・Node.js・Edge の3つの設定ファイルが、すべて同じ保護を `init` に渡していること。
// (どれか1つだけ付け忘れる事故を、ここで検出する。別々に読み込むため関数の同一性ではなく、振る舞いで比べる)
type InitOptions = Record<string, any>;

function loadInitOptions(load: () => void): InitOptions {
  let options: InitOptions | undefined;
  jest.isolateModules(() => {
    const sentry = require("@sentry/nextjs");
    load();
    options = sentry.init.mock.calls[0]?.[0];
  });
  if (!options) throw new Error("Sentry.init が呼ばれていません");
  return options;
}

describe.each([
  [
    "ブラウザ (instrumentation-client.ts)",
    () => require("../../instrumentation-client"),
  ],
  [
    "Node.js (sentry.server.config.ts)",
    () => require("../../sentry.server.config"),
  ],
  ["Edge (sentry.edge.config.ts)", () => require("../../sentry.edge.config")],
])("Sentry.init の設定: %s", (_name, load) => {
  it("保護の設定が渡されている", () => {
    const options = loadInitOptions(load);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.enableLogs).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    for (const hook of [
      "beforeSend",
      "beforeBreadcrumb",
      "beforeSendTransaction",
      "beforeSendLog",
      "beforeSendMetric",
    ]) {
      expect(typeof options[hook]).toBe("function");
    }
  });

  it("渡されたフックが、実際に機密情報を取り除く・送らない", () => {
    const options = loadInitOptions(load);
    const sent = options.beforeSend(rawErrorEvent());
    expect(sent).not.toBeNull();
    expectNoSecrets(sent);
    expect(
      options.beforeBreadcrumb({ category: "console", message: S.dream })
    ).toBeNull();
    expect(options.beforeSendTransaction({ type: "transaction" })).toBeNull();
    expect(options.beforeSendLog({ message: S.dream })).toBeNull();
    expect(options.beforeSendMetric({ name: S.email })).toBeNull();
  });
});
