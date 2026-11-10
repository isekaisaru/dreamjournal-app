/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FILTERED_MESSAGE,
  FILTERED_URL,
  sanitizeBreadcrumb,
  sanitizeEvent,
  sanitizeFilename,
  sanitizeMessage,
  sanitizeUrl,
} from "@/lib/sentryPrivacy";

// ここに出てくる値はすべて架空のダミーです。実在のトークン・メール・夢本文は使いません。
const S = {
  resetToken: "RESETTOKEN_dummy_Zx81QpLm44aa90bbCc77",
  verifyToken: "VERIFYTOKEN_dummy_Qw12ErTy34uiOp56",
  email: "dummy.user@example.invalid",
  dream: "ゆうべの夢でダミーのくじらと空を飛んだ",
  bearer: "Bearer DUMMY_BEARER_VALUE_123",
  cookie: "access_token=DUMMY_COOKIE_VALUE_456; refresh=DUMMY_REFRESH_789",
  password: "DummyPassw0rd!",
};

// 送信データを文字列にしたとき、ダミーの秘密が1つも残っていないことを確かめる。
const FORBIDDEN_FRAGMENTS = [
  S.resetToken,
  S.verifyToken,
  S.email,
  S.dream,
  "DUMMY_BEARER_VALUE_123",
  "DUMMY_COOKIE_VALUE_456",
  "DUMMY_REFRESH_789",
  S.password,
  "dreamjournal.invalid",
];

function expectNoSecrets(output: unknown) {
  const text = JSON.stringify(output);
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    expect(text).not.toContain(fragment);
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function buildRawEvent() {
  return {
    event_id: "0123456789abcdef0123456789abcdef",
    timestamp: 1700000000.5,
    platform: "javascript",
    level: "error",
    release: "yumetree@1.2.3",
    environment: "production",
    server_name: "internal-host-dummy",
    transaction: `/password-reset/${S.resetToken}`,
    message: `failed for ${S.email}`,
    user: { email: S.email, id: "42", ip_address: "203.0.113.9" },
    extra: {
      dreamBody: S.dream,
      nested: { deeper: [{ text: S.dream }] },
    },
    tags: { handled: "yes", mechanism: "generic", dream_title: S.dream },
    contexts: {
      browser: { name: "Safari", version: "17.4" },
      custom: { dream: S.dream },
      trace: {
        trace_id: "0123456789abcdef0123456789abcdef",
        span_id: "0123456789abcdef",
        op: "pageload",
        data: { url: S.email },
      },
    },
    request: {
      url: `https://dreamjournal-app.vercel.app/password-reset/${S.resetToken}?email=${S.email}#frag`,
      method: "PATCH",
      headers: {
        Cookie: S.cookie,
        Authorization: S.bearer,
        Referer: `https://dreamjournal.invalid/password-reset/${S.resetToken}?x=1`,
      },
      cookies: { access_token: "DUMMY_COOKIE_VALUE_456" },
      data: { password: S.password, body: S.dream },
      query_string: `token=${S.verifyToken}`,
    },
    exception: {
      values: [
        {
          type: "Error",
          value: `${S.dream} ${S.email}`,
          mechanism: {
            type: "onunhandledrejection",
            handled: false,
            data: { leaked: S.dream },
          },
          stacktrace: {
            frames: [
              {
                filename: `https://dreamjournal-app.vercel.app/_next/static/chunks/app.js?v=${S.verifyToken}`,
                function: "renderForest",
                lineno: 10,
                colno: 5,
                in_app: true,
                vars: { dream: S.dream },
                context_line: S.dream,
              },
            ],
          },
        },
        {
          type: "ApiError",
          value: `API request to /password_resets/${S.resetToken} timed out after 15s.`,
        },
      ],
    },
    breadcrumbs: [
      {
        category: "console",
        level: "log",
        message: S.dream,
        data: { arguments: [S.dream] },
      },
      { category: "ui.input", message: `input#email ${S.email}` },
      { category: "ui.click", message: "button.save", timestamp: 1700000000 },
      {
        category: "navigation",
        data: { from: `/password-reset/${S.resetToken}?x=1`, to: "/home" },
      },
      {
        category: "fetch",
        type: "http",
        data: {
          method: "POST",
          url: `/proxy/password_resets/${S.resetToken}`,
          status_code: 400,
          request_body: S.password,
        },
      },
      { category: "custom.dream", message: S.dream, data: { text: S.dream } },
    ],
  };
}

describe("sanitizeUrl", () => {
  it("パスワード再設定の画面URL: トークン・クエリ・fragment・userinfo を除く", () => {
    const url = `https://user:pw@dreamjournal-app.vercel.app/password-reset/${S.resetToken}?email=${S.email}#frag`;

    expect(sanitizeUrl(url)).toBe(
      "https://dreamjournal-app.vercel.app/password-reset/[token]"
    );
  });

  it("相対URL: トークンとクエリを除く", () => {
    expect(
      sanitizeUrl(`/password-reset/${S.resetToken}?token=${S.verifyToken}`)
    ).toBe("/password-reset/[token]");
  });

  it("APIのURL(/password_resets/:token)と /proxy 付きURLを変換する", () => {
    expect(sanitizeUrl(`/password_resets/${S.resetToken}`)).toBe(
      "/password_resets/[token]"
    );
    expect(sanitizeUrl(`/proxy/password_resets/${S.resetToken}`)).toBe(
      "/proxy/password_resets/[token]"
    );
    expect(
      sanitizeUrl(
        `https://dreamjournal-app.onrender.com/password_resets/${S.resetToken}`
      )
    ).toBe("https://dreamjournal-app.onrender.com/password_resets/[token]");
  });

  it("メール確認URL: クエリのトークンを除く", () => {
    expect(sanitizeUrl(`/verify-email?token=${S.verifyToken}`)).toBe(
      "/verify-email"
    );
    expect(
      sanitizeUrl(
        `https://dreamjournal-app.vercel.app/verify-email?token=${S.verifyToken}#x`
      )
    ).toBe("https://dreamjournal-app.vercel.app/verify-email");
  });

  it("見慣れないトークン風のパス部分も [id] にする", () => {
    expect(sanitizeUrl(`/some/${S.verifyToken}/x`)).toBe("/some/[id]/x");
    const jwtLike = "aaaaaaaaaaaa.bbbbbbbbbbbb.cccccccccccc";
    expect(sanitizeUrl(`/some/${jwtLike}`)).toBe("/some/[id]");
  });

  it("普通のパス(数字のIDや静的ファイル名)はそのまま残す", () => {
    expect(sanitizeUrl("/dreams/123/edit")).toBe("/dreams/123/edit");
    expect(sanitizeUrl("/_next/static/chunks/app/page-1a2b.js")).toBe(
      "/_next/static/chunks/app/page-1a2b.js"
    );
  });

  it("解釈できない・危険なURLは安全な固定文字列にする", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe(FILTERED_URL);
    expect(sanitizeUrl("http://")).toBe(FILTERED_URL);
    expect(sanitizeUrl(undefined)).toBe(FILTERED_URL);
    expect(sanitizeUrl({ url: S.resetToken })).toBe(FILTERED_URL);
  });
});

describe("sanitizeFilename", () => {
  it("スタックのファイル名からクエリを除き、アプリ内の名前は残す", () => {
    expect(
      sanitizeFilename(
        `https://dreamjournal-app.vercel.app/_next/static/chunks/app.js?v=${S.verifyToken}`
      )
    ).toBe("https://dreamjournal-app.vercel.app/_next/static/chunks/app.js");
    expect(sanitizeFilename("app:///_next/static/chunks/page.js")).toBe(
      "app:///_next/static/chunks/page.js"
    );
  });

  it("想定外の形は固定文字列にする", () => {
    expect(sanitizeFilename(S.dream)).toBe("[Filtered]");
    expect(sanitizeFilename(123)).toBe("[Filtered]");
  });
});

describe("sanitizeMessage", () => {
  it("API例外の定型文は、URL部分を変換して残す", () => {
    expect(
      sanitizeMessage(
        `API request to /password_resets/${S.resetToken} failed with status 400.`
      )
    ).toBe("API request to /password_resets/[token] failed with status 400.");
    expect(
      sanitizeMessage(
        `API request to /proxy/password_resets/${S.resetToken} timed out after 15s.`
      )
    ).toBe(
      "API request to /proxy/password_resets/[token] timed out after 15s."
    );
  });

  it("診断に役立つ定型のエラー文は残す", () => {
    expect(
      sanitizeMessage("Cannot read properties of undefined (reading 'map')")
    ).toBe("Cannot read properties of undefined (reading 'map')");
    expect(sanitizeMessage("Failed to fetch")).toBe("Failed to fetch");
    expect(
      sanitizeMessage(
        "Minified React error #418; visit https://x.invalid?args[]=" + S.dream
      )
    ).toBe("Minified React error #418");
  });

  it("上記以外の自由な文章は、中身にかかわらず送らない", () => {
    expect(sanitizeMessage(`${S.dream} ${S.email}`)).toBe(FILTERED_MESSAGE);
    expect(sanitizeMessage(`Invalid token ${S.resetToken}`)).toBe(
      FILTERED_MESSAGE
    );
    expect(sanitizeMessage(null)).toBe(FILTERED_MESSAGE);
    expect(sanitizeMessage("x".repeat(5000))).toBe(FILTERED_MESSAGE);
  });
});

describe("sanitizeBreadcrumb", () => {
  it("console と ui.input は捨てる(生の引数・入力値が入るため)", () => {
    expect(
      sanitizeBreadcrumb({
        category: "console",
        message: S.dream,
        data: { arguments: [S.dream] },
      })
    ).toBeNull();
    expect(
      sanitizeBreadcrumb({ category: "ui.input", message: S.email })
    ).toBeNull();
  });

  it("ui.click は種別だけ残し、メッセージ(セレクタ文字列)は消す", () => {
    expect(
      sanitizeBreadcrumb({
        category: "ui.click",
        message: `button ${S.email}`,
        timestamp: 5,
      })
    ).toEqual({ category: "ui.click", timestamp: 5 });
  });

  it("navigation はURLを変換して残す", () => {
    const out = sanitizeBreadcrumb({
      category: "navigation",
      data: { from: `/password-reset/${S.resetToken}?x=1`, to: "/home" },
    });

    expect(out).toEqual({
      category: "navigation",
      data: { from: "/password-reset/[token]", to: "/home" },
    });
  });

  it("fetch は method・変換済みURL・status_code だけ残す", () => {
    const out = sanitizeBreadcrumb({
      category: "fetch",
      type: "http",
      data: {
        method: "POST",
        url: `/proxy/password_resets/${S.resetToken}`,
        status_code: 400,
        request_body: S.password,
      },
    });

    expect(out).toEqual({
      category: "fetch",
      type: "http",
      data: {
        method: "POST",
        url: "/proxy/password_resets/[token]",
        status_code: 400,
      },
    });
    expectNoSecrets(out);
  });

  it("未知のカテゴリは message と data を落とす", () => {
    const out = sanitizeBreadcrumb({
      category: "custom.dream",
      message: S.dream,
      data: { text: S.dream },
    });

    expect(out).toEqual({ category: "custom.dream" });
  });

  it("入力を変更しない", () => {
    const input = deepFreeze({
      category: "fetch",
      data: { url: `/password_resets/${S.resetToken}`, status_code: 200 },
    });
    const before = JSON.stringify(input);

    sanitizeBreadcrumb(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it("処理に失敗したら生データを返さず null にする", () => {
    const breadcrumb: Record<string, unknown> = { category: "fetch" };
    Object.defineProperty(breadcrumb, "data", {
      enumerable: true,
      get() {
        throw new Error(S.dream);
      },
    });

    expect(sanitizeBreadcrumb(breadcrumb)).toBeNull();
  });
});

describe("sanitizeEvent", () => {
  it("機密情報を含むイベントから、ダミー秘密がすべて消える", () => {
    const out = sanitizeEvent(buildRawEvent());

    expect(out).not.toBeNull();
    expectNoSecrets(out);
  });

  it("診断に必要な情報は残る", () => {
    const out = sanitizeEvent(buildRawEvent()) as Record<string, any>;

    expect(out.event_id).toBe("0123456789abcdef0123456789abcdef");
    expect(out.timestamp).toBe(1700000000.5);
    expect(out.level).toBe("error");
    expect(out.release).toBe("yumetree@1.2.3");
    expect(out.environment).toBe("production");
    expect(out.transaction).toBe("/password-reset/[token]");
    expect(out.message).toBe(FILTERED_MESSAGE);
    expect(out.tags).toEqual({ handled: "yes", mechanism: "generic" });
    expect(out.contexts.browser).toEqual({ name: "Safari", version: "17.4" });
    expect(out.contexts.trace).toEqual({
      trace_id: "0123456789abcdef0123456789abcdef",
      span_id: "0123456789abcdef",
      op: "pageload",
    });
    expect(out.request).toEqual({
      url: "https://dreamjournal-app.vercel.app/password-reset/[token]",
      method: "PATCH",
    });
  });

  it("連鎖した例外: 種別・定型文・スタック位置は残し、自由文は消す", () => {
    const out = sanitizeEvent(buildRawEvent()) as Record<string, any>;

    expect(out.exception.values).toEqual([
      {
        type: "Error",
        value: FILTERED_MESSAGE,
        mechanism: { type: "onunhandledrejection", handled: false },
        stacktrace: {
          frames: [
            {
              filename:
                "https://dreamjournal-app.vercel.app/_next/static/chunks/app.js",
              lineno: 10,
              colno: 5,
              in_app: true,
            },
          ],
        },
      },
      {
        type: "ApiError",
        value: "API request to /password_resets/[token] timed out after 15s.",
      },
    ]);
  });

  it("user・extra・独自contexts・request の headers/cookies/data は送らない", () => {
    const out = sanitizeEvent(buildRawEvent()) as Record<string, any>;

    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.server_name).toBeUndefined();
    expect(out.contexts.custom).toBeUndefined();
    expect(out.request.headers).toBeUndefined();
    expect(out.request.cookies).toBeUndefined();
    expect(out.request.data).toBeUndefined();
    expect(out.request.query_string).toBeUndefined();
  });

  it("breadcrumbs: 危険なものは捨て、残るものは変換済みになる", () => {
    const out = sanitizeEvent(buildRawEvent()) as Record<string, any>;

    expect(out.breadcrumbs).toEqual([
      { category: "ui.click", timestamp: 1700000000 },
      {
        category: "navigation",
        data: { from: "/password-reset/[token]", to: "/home" },
      },
      {
        category: "fetch",
        type: "http",
        data: {
          method: "POST",
          url: "/proxy/password_resets/[token]",
          status_code: 400,
        },
      },
      { category: "custom.dream" },
    ]);
  });

  it("エラー以外の種類のイベント(transaction など)は、今は捨てる", () => {
    expect(
      sanitizeEvent({ type: "transaction", transaction: "/x" })
    ).toBeNull();
  });

  it("入力を変更しない(凍結した入力でも動く)", () => {
    const input = deepFreeze(buildRawEvent());
    const before = JSON.stringify(input);

    const out = sanitizeEvent(input);

    expect(out).not.toBeNull();
    expect(JSON.stringify(input)).toBe(before);
  });

  it("循環参照を含む入力でも止まらず、秘密は出ない", () => {
    const extra: Record<string, unknown> = { dream: S.dream };
    extra.self = extra;
    const event = { ...buildRawEvent(), extra };

    const out = sanitizeEvent(event);

    expect(out).not.toBeNull();
    expectNoSecrets(out);
  });

  it("処理に失敗したら生データを返さず null にする", () => {
    const event: Record<string, unknown> = {
      event_id: "0123456789abcdef0123456789abcdef",
    };
    Object.defineProperty(event, "exception", {
      enumerable: true,
      get() {
        throw new Error(S.dream);
      },
    });

    expect(sanitizeEvent(event)).toBeNull();
  });

  it("想定外の入力(null・文字列)は null にする", () => {
    expect(sanitizeEvent(null as unknown as object)).toBeNull();
    expect(sanitizeEvent(S.dream as unknown as object)).toBeNull();
  });
});

// セキュリティレビューで見つけた「取りこぼし」と「消しすぎ」の回帰テスト。
describe("セキュリティレビューで追加した検証", () => {
  it("URLのパスに入ったメールアドレス・日本語のエンコード文字列を消す", () => {
    expect(sanitizeUrl(`/users/${S.email}/profile`)).toBe(
      "/users/[email]/profile"
    );
    expect(sanitizeUrl(`/search/${encodeURIComponent(S.email)}`)).toBe(
      "/search/[encoded]"
    );
    expect(sanitizeUrl(`/search/${encodeURIComponent(S.dream)}`)).toBe(
      "/search/[encoded]"
    );
    // 壊れたエンコード(途中で切れたUTF-8)も、安全側に倒して消す
    expect(sanitizeUrl("/search/%E3%82")).toBe("/search/[encoded]");
  });

  it("Next.js のルート表記([profileId])や版番号つきの名前は消しすぎない", () => {
    expect(sanitizeUrl("/forest/%5BprofileId%5D")).toBe(
      "/forest/%5BprofileId%5D"
    );
    expect(
      sanitizeFilename(
        "webpack-internal:///./node_modules/.pnpm/next@16.4.1/node_modules/next/dist/x.js"
      )
    ).toBe(
      "webpack-internal:///./node_modules/.pnpm/next@16.4.1/node_modules/next/dist/x.js"
    );
    expect(sanitizeFilename("app:///node_modules/@sentry/nextjs/x.js")).toBe(
      "app:///node_modules/@sentry/nextjs/x.js"
    );
  });

  it("ファイル名にメールアドレスが紛れていたら送らない", () => {
    expect(sanitizeFilename(S.email)).toBe("[Filtered]");
    expect(sanitizeFilename(`app:///${S.email}`)).toBe("[Filtered]");
  });

  it("変換結果をもう一度変換しても変わらない(冪等)", () => {
    const inputs = [
      `/password-reset/${S.resetToken}?x=1`,
      `https://dreamjournal-app.onrender.com/password_resets/${S.resetToken}`,
      `/users/${S.email}`,
      "/dreams/123/edit",
    ];

    for (const input of inputs) {
      const once = sanitizeUrl(input);
      expect(sanitizeUrl(once)).toBe(once);
    }
  });

  it("既知の割り切り: 長くて数字を含む英数字ハイフンの塊は [id] になる", () => {
    // 日付つきのスラッグなども対象になる(トークンの取りこぼしを避けるための安全側の判断)
    expect(sanitizeUrl("/news/weekly-dream-news-2026-10-29")).toBe(
      "/news/[id]"
    );
  });

  it("プロパティ名・変数名にトークンが入った定型エラーも、そのまま送らない", () => {
    expect(
      sanitizeMessage(
        `Cannot read properties of undefined (reading '${S.resetToken}')`
      )
    ).toBe("Cannot read properties of undefined (reading '[id]')");
    expect(sanitizeMessage(`${S.resetToken} is not a function`)).toBe(
      "[id] is not a function"
    );
    expect(sanitizeMessage(`data.${S.verifyToken} is not defined`)).toBe(
      "[id] is not defined"
    );
  });

  it("カテゴリ名の大文字小文字が違っても console / ui.input は捨てる", () => {
    expect(
      sanitizeBreadcrumb({ category: "Console", message: S.dream })
    ).toBeNull();
    expect(
      sanitizeBreadcrumb({ category: "UI.Input", message: S.email })
    ).toBeNull();
    expect(
      sanitizeBreadcrumb({
        category: "FETCH",
        data: { url: `/password_resets/${S.resetToken}`, status_code: 400 },
      })
    ).toEqual({
      category: "FETCH",
      data: { url: "/password_resets/[token]", status_code: 400 },
    });
  });

  it("breadcrumb に想定外の値(null・文字列・配列)が来たら null にする", () => {
    expect(sanitizeBreadcrumb(null as unknown as object)).toBeNull();
    expect(sanitizeBreadcrumb(S.dream as unknown as object)).toBeNull();
    expect(sanitizeBreadcrumb([S.dream] as unknown as object)).toBeNull();
  });

  it("breadcrumbs が { values: [...] } の形でも変換される", () => {
    const out = sanitizeEvent({
      breadcrumbs: {
        values: [
          { category: "console", message: S.dream },
          { category: "ui.click", message: S.email },
        ],
      },
    }) as Record<string, any>;

    expect(out.breadcrumbs).toEqual([{ category: "ui.click" }]);
    expectNoSecrets(out);
  });

  it("type: error は通し、level が不正なら level だけ捨てる", () => {
    const out = sanitizeEvent({
      type: "error",
      level: S.dream,
      event_id: "0123456789abcdef0123456789abcdef",
    }) as Record<string, any>;

    expect(out).toEqual({ event_id: "0123456789abcdef0123456789abcdef" });
  });

  it("tags: 許可したキーで安全な値だけ残し、真偽値・数値も扱う", () => {
    const out = sanitizeEvent({
      tags: {
        handled: true,
        runtime: 5,
        mechanism: S.dream,
        dream_title: "ok-looking-value",
      },
    }) as Record<string, any>;

    expect(out.tags).toEqual({ handled: true, runtime: 5 });
  });

  it("例外の種別名が不正な文字列なら Error に置き換える", () => {
    const out = sanitizeEvent({
      exception: {
        values: [{ type: S.dream, value: "Failed to fetch" }, { value: "x" }],
      },
    }) as Record<string, any>;

    expect(out.exception.values).toEqual([
      { type: "Error", value: "Failed to fetch" },
      { type: "Error", value: FILTERED_MESSAGE },
    ]);
  });

  it("transaction 名: URLなら変換し、それ以外の文字列は送らない", () => {
    const url = sanitizeEvent({
      transaction: `GET /password_resets/${S.resetToken}?x=1`,
    }) as Record<string, any>;
    const other = sanitizeEvent({ transaction: S.dream }) as Record<
      string,
      any
    >;

    expect(url.transaction).toBe("GET /password_resets/[token]");
    expect(other.transaction).toBe("[Filtered]");
  });

  it("件数の上限: 例外は10件、スタックのフレームは100件、breadcrumbは100件まで", () => {
    const frames = Array.from({ length: 150 }, (_, i) => ({
      filename: "app:///page.js",
      lineno: i,
    }));
    const values = Array.from({ length: 15 }, () => ({
      type: "Error",
      value: "Failed to fetch",
      stacktrace: { frames },
    }));
    const breadcrumbs = Array.from({ length: 150 }, (_, i) => ({
      category: "ui.click",
      timestamp: i,
    }));

    const out = sanitizeEvent({
      exception: { values },
      breadcrumbs,
    }) as Record<string, any>;

    expect(out.exception.values).toHaveLength(10);
    expect(out.exception.values[0].stacktrace.frames).toHaveLength(100);
    // 古い方を捨て、新しい方(末尾)を残す
    expect(out.exception.values[0].stacktrace.frames[99].lineno).toBe(149);
    expect(out.breadcrumbs).toHaveLength(100);
    expect(out.breadcrumbs[99].timestamp).toBe(149);
  });

  it("出力を書き換えても入力は変わらない(参照を共有しない)", () => {
    const input = buildRawEvent();
    const before = JSON.stringify(input);

    const out = sanitizeEvent(input) as Record<string, any>;
    out.exception.values[0].stacktrace.frames[0].filename = "changed";
    out.exception.values[0].mechanism.type = "changed";
    out.breadcrumbs.length = 0;
    out.contexts.browser.name = "changed";
    out.request.url = "changed";

    expect(JSON.stringify(input)).toBe(before);
  });
});

// Codex 独立レビューの High 1 の回帰テスト。入力はすべて架空の値。
describe("High 1: ファイル名・親パスのエンコード・例外の種別・function/module", () => {
  describe("sanitizeFilename: アプリ内の名前(app:/// など)に入ったトークン", () => {
    it("app:/// の再設定・メール確認パスの直後はトークンとして置き換える", () => {
      expect(
        sanitizeFilename(
          `app:///_next/static/chunks/password-reset/${S.resetToken}/page.js`
        )
      ).toBe("app:///_next/static/chunks/password-reset/[token]/page.js");
      expect(
        sanitizeFilename(`app:///verify-email/${S.verifyToken}?v=1#x`)
      ).toBe("app:///verify-email/[token]");
    });

    it("webpack-internal:/// のパスでも置き換える(ルート括弧は消しすぎない)", () => {
      expect(
        sanitizeFilename(
          `webpack-internal:///(app-pages-browser)/./app/(auth)/verify-email/${S.verifyToken}/page.tsx`
        )
      ).toBe(
        "webpack-internal:///(app-pages-browser)/./app/(auth)/verify-email/[token]/page.tsx"
      );
    });

    it("親パスが無くても、トークン風の長い塊は [id] にする", () => {
      expect(sanitizeFilename(`app:///_next/${S.resetToken}/page.js`)).toBe(
        "app:///_next/[id]/page.js"
      );
      expect(sanitizeFilename(`./app/dreams/${S.resetToken}/page.tsx`)).toBe(
        "./app/dreams/[id]/page.tsx"
      );
    });

    it("scheme の無い相対パスでも親パスの直後は置き換える", () => {
      expect(
        sanitizeFilename(`./app/password_resets/${S.resetToken}/route.ts`)
      ).toBe("./app/password_resets/[token]/route.ts");
    });

    it("変換結果をもう一度変換しても変わらない(冪等)", () => {
      const inputs = [
        `app:///_next/static/chunks/password-reset/${S.resetToken}/page.js`,
        `webpack-internal:///(app-pages-browser)/./app/verify-email/${S.verifyToken}/page.tsx`,
        `app:///_next/${S.resetToken}/page.js`,
      ];
      for (const input of inputs) {
        const once = sanitizeFilename(input);
        expect(sanitizeFilename(once)).toBe(once);
      }
    });

    it("abs_path も filename と同じ規則で変換される", () => {
      const out = sanitizeEvent({
        exception: {
          values: [
            {
              type: "Error",
              stacktrace: {
                frames: [
                  {
                    filename: `app:///password-reset/${S.resetToken}/page.js`,
                    abs_path: `webpack-internal:///./app/verify-email/${S.verifyToken}/page.js`,
                  },
                ],
              },
            },
          ],
        },
      }) as Record<string, any>;

      expect(out.exception.values[0].stacktrace.frames[0]).toEqual({
        filename: "app:///password-reset/[token]/page.js",
        abs_path: "webpack-internal:///./app/verify-email/[token]/page.js",
      });
      expectNoSecrets(out);
    });

    it("消しすぎない: 通常のファイル名・パスは変わらない", () => {
      expect(sanitizeFilename("app:///_next/static/chunks/page.js")).toBe(
        "app:///_next/static/chunks/page.js"
      );
      expect(
        sanitizeFilename("webpack-internal:///(app-pages-browser)/./app/x.tsx")
      ).toBe("webpack-internal:///(app-pages-browser)/./app/x.tsx");
      // 親パス名そのもの(直後が無い)は変わらない
      expect(sanitizeFilename("app:///password-reset")).toBe(
        "app:///password-reset"
      );
    });
  });

  describe("エンコードされた親パス", () => {
    // 親パス名を %XX で隠しても、デコードして照合するので直後はトークンとして置き換える。
    const encodedParents = [
      "%70assword-reset", // p を %70
      "password%2Dreset", // - を %2D
      "password%2dreset", // 小文字の16進
      "password%5Freset", // _ を %5F
      "password%5fresets",
      "verify%2Demail",
      "%2570assword-reset", // 二重エンコード
      "%252570assword-reset", // 三重エンコード
      "PASSWORD-RESET", // 大文字
    ];

    it.each(encodedParents)("%s の直後のトークンを置き換える", (parent) => {
      const out = sanitizeUrl(`/${parent}/${S.resetToken}`);
      expect(out).toBe(`/${parent}/[token]`);
      expect(out).not.toContain(S.resetToken);
    });

    it.each(encodedParents)(
      "%s: 絶対URL・filename・transaction 経由でも同じ",
      (parent) => {
        expect(
          sanitizeUrl(
            `https://dreamjournal-app.vercel.app/${parent}/${S.resetToken}`
          )
        ).toBe(`https://dreamjournal-app.vercel.app/${parent}/[token]`);
        expect(
          sanitizeFilename(`app:///${parent}/${S.resetToken}/page.js`)
        ).toBe(`app:///${parent}/[token]/page.js`);
        const out = sanitizeEvent({
          transaction: `GET /${parent}/${S.resetToken}`,
        }) as Record<string, any>;
        expect(out.transaction).toBe(`GET /${parent}/[token]`);
      }
    );

    it("スラッシュまでエンコードして1つの区切りに押し込んでも消す", () => {
      for (const joined of [
        `password-reset%2F${S.resetToken}`,
        `password-reset%2f${S.resetToken}`,
        `%70assword-reset%2F${S.resetToken}`,
        `password-reset%5C${S.resetToken}`, // バックスラッシュ
      ]) {
        const out = sanitizeUrl(`/${joined}`);
        expect(out).toBe("/[token]");
      }
      // 親パスだけが入っていて、トークンは次の区切りにある場合
      expect(sanitizeUrl(`/password-reset%2F/${S.resetToken}`)).toBe(
        "/[token]/[token]"
      );
    });

    it("消しすぎない: 親パス名でないエンコード済みの区切りはそのまま", () => {
      expect(sanitizeUrl("/forest/%5BprofileId%5D")).toBe(
        "/forest/%5BprofileId%5D"
      );
      expect(sanitizeUrl("/dreams/123%2Dabc/edit")).toBe(
        "/dreams/123%2Dabc/edit"
      );
      expect(sanitizeUrl("/%70assword-reset")).toBe("/%70assword-reset");
    });

    it("変換結果をもう一度変換しても変わらない(冪等)", () => {
      for (const parent of encodedParents) {
        const once = sanitizeUrl(`/${parent}/${S.resetToken}`);
        expect(sanitizeUrl(once)).toBe(once);
      }
    });

    it("breadcrumb の fetch / navigation と request.url でも同様に消える", () => {
      const out = sanitizeEvent({
        request: { url: `/%70assword-reset/${S.resetToken}`, method: "GET" },
        breadcrumbs: [
          {
            category: "navigation",
            data: { from: `/verify%2Demail/${S.verifyToken}`, to: "/home" },
          },
          {
            category: "fetch",
            data: {
              url: `/proxy/password%5Fresets/${S.resetToken}`,
              method: "POST",
            },
          },
        ],
      }) as Record<string, any>;

      expect(out.request.url).toBe("/%70assword-reset/[token]");
      expect(out.breadcrumbs[0].data.from).toBe("/verify%2Demail/[token]");
      expect(out.breadcrumbs[1].data.url).toBe(
        "/proxy/password%5Fresets/[token]"
      );
      expectNoSecrets(out);
    });
  });

  describe("例外の type は既知の安全な値だけ", () => {
    const typeOf = (type: unknown) =>
      (
        sanitizeEvent({
          exception: { values: [{ type, value: "Failed to fetch" }] },
        }) as Record<string, any>
      ).exception.values[0].type;

    it.each([
      "Error",
      "TypeError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "URIError",
      "EvalError",
      "AggregateError",
      "DOMException",
      "ApiError",
      "AbortError",
      "UnhandledRejection",
    ])("既知の種別 %s はそのまま残す", (type) => {
      expect(typeOf(type)).toBe(type);
    });

    it("トークン・メール・夢本文を種別名に入れても Error に置き換える", () => {
      // 識別子として正しい形(旧実装の正規表現を通る)でも、既知の値でなければ捨てる
      for (const type of [
        S.resetToken,
        S.verifyToken,
        `Error_${S.resetToken}`,
        "dummy.user",
        "DreamBody_ゆうべ",
        S.dream,
        S.email,
        "CustomUserError",
        "typeerror", // 大文字小文字が違うものは既知ではない
        "TypeError ",
        "",
        null,
        undefined,
        123,
        { name: S.resetToken },
      ]) {
        expect(typeOf(type)).toBe("Error");
      }
    });

    it("置き換え後の出力にダミー秘密が残らない", () => {
      const out = sanitizeEvent({
        exception: {
          values: [
            { type: S.resetToken, value: "x" },
            { type: S.verifyToken, value: "x" },
          ],
        },
      });
      expectNoSecrets(out);
    });
  });

  describe("スタックフレームの function / module は送らない", () => {
    it("トークンや夢本文を含みうる function / module を出力に含めない", () => {
      const frame = {
        filename: "app:///_next/static/chunks/page.js",
        function: `handle_${S.resetToken}`,
        module: `app:///password-reset/${S.resetToken}/page`,
        lineno: 3,
        colno: 7,
        in_app: true,
      };
      const out = sanitizeEvent({
        exception: {
          values: [{ type: "Error", stacktrace: { frames: [frame] } }],
        },
      }) as Record<string, any>;

      expect(out.exception.values[0].stacktrace.frames[0]).toEqual({
        filename: "app:///_next/static/chunks/page.js",
        lineno: 3,
        colno: 7,
        in_app: true,
      });
      expectNoSecrets(out);
    });

    it("無害に見える function / module も固定的に除く(安全だと断定できないため)", () => {
      const out = sanitizeEvent({
        exception: {
          values: [
            {
              type: "Error",
              stacktrace: {
                frames: [
                  { function: "renderForest", module: "app.forest", lineno: 1 },
                  { function: S.dream, module: S.email, lineno: 2 },
                ],
              },
            },
          ],
        },
      }) as Record<string, any>;

      expect(out.exception.values[0].stacktrace.frames).toEqual([
        { lineno: 1 },
        { lineno: 2 },
      ]);
      expectNoSecrets(out);
    });
  });
});

// Codex 再レビューの指摘(デコード上限・セミコロン・mechanism.type・正常なソース名)の回帰テスト。
// 入力はすべて架空の値。NOSEP は「数字を含まない」トークンの例(数字が無いと長い塊の検出に掛からない)。
const NOSEP = "DUMMYTOKENONLYLETTERS";

describe("再レビュー指摘: デコード回数の上限", () => {
  it("4重以上のエンコードで親パスを隠しても、固定値に置き換えて直後も消す", () => {
    for (const layers of [4, 5, 8]) {
      // p を layers 重にエンコードした形。例: 3重 = %252570、4重 = %25252570
      const parent = `%${"25".repeat(layers - 1)}70assword-reset`;
      expect(sanitizeUrl(`/${parent}/${NOSEP}`)).toBe("/[encoded]/[token]");
      expect(
        sanitizeUrl(`https://dreamjournal-app.vercel.app/${parent}/${NOSEP}`)
      ).toBe("https://dreamjournal-app.vercel.app/[encoded]/[token]");
    }
  });

  it("上限(3回)ちょうどで判断できるものは、これまでどおり親パスとして扱う", () => {
    expect(sanitizeUrl(`/%252570assword-reset/${NOSEP}`)).toBe(
      `/%252570assword-reset/[token]`
    );
  });

  it("filename・request.url・transaction・breadcrumb でも元の値を返さない", () => {
    const parent = "%25252570assword-reset";
    expect(sanitizeFilename(`app:///${parent}/${NOSEP}/page.js`)).toBe(
      "app:///[encoded]/[token]/page.js"
    );
    const out = sanitizeEvent({
      transaction: `GET /${parent}/${NOSEP}`,
      request: { url: `/${parent}/${NOSEP}` },
      breadcrumbs: [
        { category: "navigation", data: { from: `/${parent}/${NOSEP}` } },
      ],
    }) as Record<string, any>;

    expect(out.transaction).toBe("GET /[encoded]/[token]");
    expect(out.request.url).toBe("/[encoded]/[token]");
    expect(out.breadcrumbs[0].data.from).toBe("/[encoded]/[token]");
    expect(JSON.stringify(out)).not.toContain(NOSEP);
    expect(JSON.stringify(out)).not.toContain("assword");
  });

  it("非常に長い多重エンコードでも処理が膨らまず、固定値になる", () => {
    // "%" + "25"×1300 + "70" = 1300重にエンコードされた "p"
    const long = `%${"25".repeat(1300)}70`;
    const start = Date.now();
    expect(sanitizeUrl(`/${long}`)).toBe("/[encoded]");
    expect(sanitizeFilename(`app:///${long}/page.js`)).toBe(
      "app:///[encoded]/page.js"
    );
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("消しすぎない: 1回でデコードが終わる正常なパスはそのまま", () => {
    expect(sanitizeUrl("/forest/%5BprofileId%5D")).toBe(
      "/forest/%5BprofileId%5D"
    );
    expect(sanitizeUrl("/dreams/100%25")).toBe("/dreams/100%25");
  });

  it("変換結果をもう一度変換しても変わらない(冪等)", () => {
    const once = sanitizeUrl(`/%25252570assword-reset/${NOSEP}`);
    expect(sanitizeUrl(once)).toBe(once);
  });
});

describe("再レビュー指摘: セミコロン付きパス", () => {
  it.each([
    ["/password-reset;v=1/" + NOSEP, "/password-reset/[token]"],
    ["/password-reset;token=" + NOSEP, "/password-reset"],
    ["/verify-email;a=b;token=" + NOSEP + "/" + NOSEP, "/verify-email/[token]"],
    ["/password-reset/" + NOSEP + ";v=1", "/password-reset/[token]"],
    ["/PASSWORD_RESETS;x=1/" + NOSEP, "/PASSWORD_RESETS/[token]"],
    ["/dreams;jsessionid=" + NOSEP + "/42", "/dreams/42"],
    ["/;token=" + NOSEP, "/[params]"],
  ])("%s → %s", (input, expected) => {
    const out = sanitizeUrl(input);
    expect(out).toBe(expected);
    expect(out).not.toContain(NOSEP);
    expect(sanitizeUrl(out)).toBe(out); // 冪等
  });

  it("; をエンコードして隠しても、; 以降は送らず親パスも見落とさない", () => {
    expect(sanitizeUrl(`/password-reset%3Btoken=${NOSEP}`)).toBe(
      "/password-reset"
    );
    expect(sanitizeUrl(`/password-reset%3bv=1/${NOSEP}`)).toBe(
      "/password-reset/[token]"
    );
    // 多重エンコードされた ; は、元の位置を特定できないので固定値にする
    expect(sanitizeUrl(`/password-reset%253Btoken=${NOSEP}`)).toBe("/[params]");
    expect(sanitizeUrl(`/password-reset%253Bv=1/${NOSEP}`)).toBe(
      "/[params]/[token]"
    );
  });

  it("絶対URL・transaction・request.url・breadcrumb でも ; 以降を送らない", () => {
    expect(
      sanitizeUrl(
        `https://dreamjournal-app.vercel.app/password-reset;token=${NOSEP}`
      )
    ).toBe("https://dreamjournal-app.vercel.app/password-reset");

    const out = sanitizeEvent({
      transaction: `GET /password-reset;token=${NOSEP}`,
      request: { url: `/verify-email;v=1/${NOSEP}`, method: "GET" },
      breadcrumbs: [
        {
          category: "fetch",
          data: { url: `/proxy/password_resets;x=${NOSEP}`, method: "POST" },
        },
      ],
    }) as Record<string, any>;

    expect(out.transaction).toBe("GET /password-reset");
    expect(out.request.url).toBe("/verify-email/[token]");
    expect(out.breadcrumbs[0].data.url).toBe("/proxy/password_resets");
    expect(JSON.stringify(out)).not.toContain(NOSEP);
  });

  it("ソースのファイル名に ; が入っていたら送らない", () => {
    expect(sanitizeFilename(`app:///app;token=${NOSEP}/page.js`)).toBe(
      "[Filtered]"
    );
    expect(sanitizeFilename(`./app/verify-email;v=${NOSEP}/page.tsx`)).toBe(
      "[Filtered]"
    );
  });
});

describe("再レビュー指摘: exception.mechanism.type", () => {
  const mechanismOf = (mechanism: unknown) =>
    (
      sanitizeEvent({
        exception: { values: [{ type: "Error", mechanism }] },
      }) as Record<string, any>
    ).exception.values[0].mechanism;

  // 根拠: インストール済みの @sentry/* 10.75.2 が実際に設定している値(ブラウザ・Node・React・Next.js)
  // と、旧版が使っていた onerror / onunhandledrejection。
  it.each([
    "generic",
    "chained",
    "onerror",
    "onunhandledrejection",
    "auto.browser.global_handlers.onerror",
    "auto.browser.global_handlers.onunhandledrejection",
    "auto.browser.web_worker.onunhandledrejection",
    "auto.node.onunhandledrejection",
    "auto.node.onuncaughtexception",
    "auto.core.capture_console",
    "auto.function.react.error_boundary",
    "auto.function.react.error_handler",
    "auto.function.nextjs.on_request_error",
    "auto.function.nextjs.server_component",
    "auto.function.nextjs.server_action",
    "auto.function.nextjs.route_handler",
    "auto.function.nextjs.wrapped",
    "auto.function.nextjs.underscore_error",
    "auto.http.nextjs.api_handler",
  ])("SDK が使う既知の値 %s はそのまま残す", (type) => {
    expect(mechanismOf({ type, handled: false })).toEqual({
      type,
      handled: false,
    });
  });

  it("未知の値・トークン・夢本文・形だけ似た値は固定値 generic にし、handled は維持する", () => {
    for (const type of [
      S.resetToken,
      S.dream,
      S.email,
      `auto.custom.${NOSEP}`,
      "auto.function.nextjs.wrapped.extra",
      "auto.ai.openai.stream-response", // SDK にはあるが、このアプリでは使わない統合
      "Generic", // 大文字小文字が違うものは既知ではない
      "generic ",
      "",
      123,
      { type: S.resetToken },
    ]) {
      expect(mechanismOf({ type, handled: true })).toEqual({
        type: "generic",
        handled: true,
      });
      expect(mechanismOf({ type, handled: false })).toEqual({
        type: "generic",
        handled: false,
      });
    }
  });

  it("type が無いときは足さない。handled が真偽値でなければ捨てる。data は常に捨てる", () => {
    expect(mechanismOf({ handled: true })).toEqual({ handled: true });
    expect(mechanismOf({ type: "generic", handled: S.dream })).toEqual({
      type: "generic",
    });
    const out = mechanismOf({
      type: S.resetToken,
      handled: false,
      data: { leaked: S.dream },
      source: S.email,
    });
    expect(out).toEqual({ type: "generic", handled: false });
    expectNoSecrets(out);
  });
});

describe("再レビュー指摘: 正常なソースファイル名の保持", () => {
  it.each([
    "app:///app/verify-email/page.tsx",
    "app:///app/(auth)/verify-email/page.tsx",
    "app:///app/(auth)/verify-email/layout.tsx",
    "app:///app/(auth)/verify-email/route.ts",
    "app:///app/(auth)/password-reset/[token]/page.tsx",
    "app:///app/(auth)/password-reset/%5Btoken%5D/page.tsx",
    "app:///app/forest/[profileId]/page.tsx",
    "webpack-internal:///(app-pages-browser)/./app/(auth)/verify-email/page.tsx",
    "webpack-internal:///(rsc)/./app/(auth)/password-reset/[token]/page.tsx",
    "./app/verify-email/page.tsx",
    "/var/task/.next/server/app/(auth)/verify-email/page.js",
    "/var/task/.next/server/app/(auth)/password-reset/[token]/route.js",
    "https://dreamjournal-app.vercel.app/_next/static/chunks/app/(auth)/verify-email/page-1a2b3c4d5e6f7a8b.js",
  ])("そのまま残す: %s", (filename) => {
    expect(sanitizeFilename(filename)).toBe(filename);
  });

  it("filename と abs_path の両方で保たれ、行・列番号とも対応する", () => {
    const frame = {
      filename: "app:///app/(auth)/verify-email/page.tsx",
      abs_path: "/var/task/.next/server/app/(auth)/verify-email/page.js",
      lineno: 12,
      colno: 3,
      in_app: true,
    };
    const out = sanitizeEvent({
      exception: {
        values: [{ type: "Error", stacktrace: { frames: [frame] } }],
      },
    }) as Record<string, any>;

    expect(out.exception.values[0].stacktrace.frames).toEqual([frame]);
  });

  it("保護は弱めない: 親パスの直後でも、トークン・長い名前・拡張子付きの値は置き換える", () => {
    expect(sanitizeFilename(`app:///app/verify-email/${NOSEP}/page.tsx`)).toBe(
      "app:///app/verify-email/[token]/page.tsx"
    );
    expect(sanitizeFilename(`app:///app/verify-email/${NOSEP}.tsx`)).toBe(
      "app:///app/verify-email/[token]"
    );
    expect(sanitizeFilename(`app:///verify-email/${NOSEP}.js`)).toBe(
      "app:///verify-email/[token]"
    );
    expect(sanitizeFilename(`./app/password-reset/${S.resetToken}.ts`)).toBe(
      "./app/password-reset/[token]"
    );
    // 角括弧でくるんだ長い値は、ルート名(短い識別子)とは見なさない
    expect(
      sanitizeFilename(`app:///app/verify-email/[${NOSEP}]/page.tsx`)
    ).toBe("app:///app/verify-email/[token]/page.tsx");
    // 既知のファイル名に似せた別の名前
    expect(sanitizeFilename(`app:///verify-email/page.tsx.${NOSEP}`)).toBe(
      "app:///verify-email/[token]"
    );
    expect(sanitizeFilename(`app:///verify-email/xpage.tsx`)).toBe(
      "app:///verify-email/[token]"
    );
  });

  it("実際のURLは従来どおり、親パスの直後を置き換える", () => {
    expect(sanitizeUrl(`/verify-email/${NOSEP}`)).toBe("/verify-email/[token]");
    expect(
      sanitizeUrl(`https://dreamjournal-app.vercel.app/password-reset/${NOSEP}`)
    ).toBe("https://dreamjournal-app.vercel.app/password-reset/[token]");
    expect(
      sanitizeFilename(
        `https://dreamjournal-app.vercel.app/verify-email/${S.verifyToken}`
      )
    ).toBe("https://dreamjournal-app.vercel.app/verify-email/[token]");
  });
});

describe("再レビュー指摘: 数字を含まない架空のトークン", () => {
  it("親パスの直後なら、URL・ファイル名・transaction のどれでも置き換える", () => {
    expect(sanitizeUrl(`/password-reset/${NOSEP}`)).toBe(
      "/password-reset/[token]"
    );
    expect(sanitizeUrl(`/api/v1/password_resets/${NOSEP}`)).toBe(
      "/api/v1/password_resets/[token]"
    );
    expect(sanitizeFilename(`app:///email-verification/${NOSEP}/x.js`)).toBe(
      "app:///email-verification/[token]/x.js"
    );
    const out = sanitizeEvent({
      transaction: `POST /reset-password/${NOSEP}`,
    }) as Record<string, any>;
    expect(out.transaction).toBe("POST /reset-password/[token]");
  });
});

describe("再レビュー指摘: 入力が長すぎるファイル名", () => {
  it("上限(4096文字)を超えるファイル名は中身を見ずに固定値にする", () => {
    const start = Date.now();
    expect(sanitizeFilename(`app:///${"a".repeat(5000)}.js`)).toBe(
      "[Filtered]"
    );
    expect(
      sanitizeFilename(`/${"a".repeat(5000)}/password-reset/${NOSEP}`)
    ).toBe("[Filtered]");
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

// Codex 独立再レビュー後の修正の回帰テスト(入力はすべて架空の値)。

describe("独立再レビュー: エンコードされた ; と通常の ; が混在するパス", () => {
  // 親パス名・エンコードされた ;(%253B = 2重)・トークン・通常の ; が1つの区間に混在した形
  const MIXED = `password-reset%253Btoken=${NOSEP};v=1`;

  it.each([
    // [入力, 期待値]
    [`/${MIXED}`, "/[params]"],
    [`/${MIXED}/${NOSEP}`, "/[params]/[token]"],
    // 16進の大文字小文字を変えても同じ
    [`/password-reset%253btoken=${NOSEP};v=1`, "/[params]"],
    // %253B(2重) → %3B(1重) → 通常の ; の3種類が混在
    [`/password-reset%253Btoken=${NOSEP}%3Bv=1;w=2`, "/[params]"],
    // 親パス以外でも、エンコードされた ; の手前の部分は信用せず固定値にする
    [`/dreams%253Bid=${NOSEP};x=1/42`, "/[params]/42"],
    // 4重以上は判断できないので、これまでどおり固定値
    [`/password-reset%2525253Btoken=${NOSEP};v=1`, "/[encoded]"],
    // 通常の ; が先に来て手前が安全な場合は、手前だけ残す(消しすぎない)
    [`/password-reset;v=1%253Btoken=${NOSEP}`, "/password-reset"],
    [`/dreams;x=1%253Bid=${NOSEP}/42`, "/dreams/42"],
  ])("%s → %s", (input, expected) => {
    const out = sanitizeUrl(input);
    expect(out).toBe(expected);
    expect(out).not.toContain(NOSEP);
    expect(out).not.toContain("v=1");
    expect(out).not.toContain("token=");
    // 繰り返し処理しても結果が変わらない(安全性が落ちない)
    expect(sanitizeUrl(out)).toBe(out);
    expect(sanitizeUrl(sanitizeUrl(out))).toBe(out);
  });

  it("request.url・transaction・breadcrumb・スタックのファイル名のどれでも値を送らない", () => {
    const site = "https://dreamjournal-app.vercel.app";
    const event = {
      transaction: `GET /${MIXED}/${NOSEP}`,
      request: { url: `${site}/${MIXED}/${NOSEP}` },
      breadcrumbs: [
        {
          category: "navigation",
          data: { from: `/${MIXED}`, to: `${site}/${MIXED}/${NOSEP}` },
        },
        {
          category: "fetch",
          data: { url: `/proxy/${MIXED}/${NOSEP}`, method: "GET" },
        },
      ],
      exception: {
        values: [
          {
            type: "Error",
            stacktrace: {
              frames: [
                { filename: `${site}/_next/static/${MIXED}/${NOSEP}/page.js` },
                { filename: `/${MIXED}/${NOSEP}/page.js` },
                { abs_path: `/${MIXED}/${NOSEP}/page.js` },
                { filename: `app:///${MIXED}/${NOSEP}/page.js` },
              ],
            },
          },
        ],
      },
    };
    const out = sanitizeEvent(event) as Record<string, any>;

    expect(out.transaction).toBe("GET /[params]/[token]");
    expect(out.request.url).toBe(`${site}/[params]/[token]`);
    expect(out.breadcrumbs[0].data.from).toBe("/[params]");
    expect(out.breadcrumbs[0].data.to).toBe(`${site}/[params]/[token]`);
    expect(out.breadcrumbs[1].data.url).toBe("/proxy/[params]/[token]");
    const frames = out.exception.values[0].stacktrace.frames;
    expect(frames[0].filename).toBe(
      `${site}/_next/static/[params]/[token]/page.js`
    );
    expect(frames[1].filename).toBe("/[params]/[token]/page.js");
    expect(frames[2].abs_path).toBe("/[params]/[token]/page.js");
    expect(frames[3].filename).toBe("[Filtered]");

    const json = JSON.stringify(out);
    expect(json).not.toContain(NOSEP);
    expect(json).not.toContain("v=1");
    expect(json).not.toContain("token=");
    // 出力をもう一度通しても変わらない
    expect(JSON.stringify(sanitizeEvent(out))).toBe(json);
  });
});

describe("独立再レビュー: ソース名の例外が通常の URL で値を通さない", () => {
  it("URL の中では、; やクエリや長い値を付けても親パスの直後は固定値", () => {
    const site = "https://dreamjournal-app.vercel.app";
    expect(sanitizeUrl(`/verify-email/page.tsx;token=${NOSEP}`)).toBe(
      "/verify-email/[token]"
    );
    expect(sanitizeUrl(`/verify-email/page.tsx?token=${NOSEP}`)).toBe(
      "/verify-email/page.tsx"
    );
    expect(sanitizeUrl(`${site}/password-reset/[${NOSEP}]`)).toBe(
      `${site}/password-reset/[token]`
    );
    expect(sanitizeUrl(`${site}/password-reset/${NOSEP}.tsx`)).toBe(
      `${site}/password-reset/[token]`
    );
    expect(sanitizeUrl(`${site}/verify-email/page.tsx.${NOSEP}`)).toBe(
      `${site}/verify-email/[token]`
    );
  });
});

describe("独立再レビュー: auto.core.linked_errors", () => {
  const mechanismOf = (type: unknown) =>
    (
      sanitizeEvent({
        exception: { values: [{ type: "Error", mechanism: { type } }] },
      }) as Record<string, any>
    ).exception.values[0].mechanism.type;

  // 根拠: @sentry/core 10.75.2 の build/cjs/utils/aggregate-errors.js(連鎖・集約された例外の親に付く値)
  it("SDK が連鎖した例外に付ける値はそのまま残す", () => {
    expect(mechanismOf("auto.core.linked_errors")).toBe(
      "auto.core.linked_errors"
    );
  });

  it("形が似ているだけの値は generic にする", () => {
    for (const type of [
      "auto.core.linked_errors_x",
      "auto.core.linked_errors.",
      "auto.core.linked_errors ",
      "Auto.core.linked_errors",
      "auto.core.linked_error",
      "auto.core.linkedErrors",
    ]) {
      expect(mechanismOf(type)).toBe("generic");
    }
  });
});

describe("独立再レビュー: 絶対ファイルパスのユーザー名", () => {
  it.each([
    [
      "/Users/example-user/project/frontend/app/page.tsx",
      "/Users/[user]/project/frontend/app/page.tsx",
    ],
    [
      "/home/example-user/project/app/page.tsx",
      "/home/[user]/project/app/page.tsx",
    ],
    // 空白・日本語を含むユーザー名
    [
      "/Users/Example User/project/app/page.tsx",
      "/Users/[user]/project/app/page.tsx",
    ],
    [
      "/Users/ゆめ太郎/project/app/page.tsx",
      "/Users/[user]/project/app/page.tsx",
    ],
    // エンコードされた形
    [
      "/Users/Example%20User/project/app/page.tsx",
      "/Users/[user]/project/app/page.tsx",
    ],
    [
      "file:///Users/example-user/project/app/page.tsx",
      "file:///Users/[user]/project/app/page.tsx",
    ],
    [
      "file:///home/example-user/project/app/page.tsx",
      "file:///home/[user]/project/app/page.tsx",
    ],
  ])("%s → %s", (input, expected) => {
    const out = sanitizeFilename(input);
    expect(out).toBe(expected);
    expect(out).not.toContain("example-user");
    expect(out).not.toContain("Example");
    expect(out).not.toContain("ゆめ");
    expect(sanitizeFilename(out)).toBe(out); // 冪等
  });

  it("filename と abs_path の両方で、行・列番号はそのまま", () => {
    const out = sanitizeEvent({
      exception: {
        values: [
          {
            type: "Error",
            stacktrace: {
              frames: [
                {
                  filename: "/Users/example-user/project/app/page.tsx",
                  abs_path: "/Users/example-user/project/app/page.tsx",
                  lineno: 7,
                  colno: 9,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
    }) as Record<string, any>;

    expect(out.exception.values[0].stacktrace.frames).toEqual([
      {
        filename: "/Users/[user]/project/app/page.tsx",
        abs_path: "/Users/[user]/project/app/page.tsx",
        lineno: 7,
        colno: 9,
        in_app: true,
      },
    ]);
    expect(JSON.stringify(out)).not.toContain("example-user");
  });

  it("ユーザー名ではない場所は変えない(ソースマップ照合に使う名前を壊さない)", () => {
    for (const same of [
      "/var/task/.next/server/app/home/components/Foo.js",
      "/var/task/.next/server/app/(auth)/verify-email/page.js",
      "app:///app/home/components/Foo.tsx",
      "app:///app/home/page.tsx",
      "./app/home/page.tsx",
      "/home/page.js",
      "https://dreamjournal-app.vercel.app/_next/static/chunks/app/home/page-1a2b3c4d5e6f7a8b.js",
    ]) {
      expect(sanitizeFilename(same)).toBe(same);
    }
  });
});

describe("独立再レビュー: 長さの境界(4095・4096・4097文字)", () => {
  // 英字だけの名前なので、長さ以外の理由では置き換わらない
  const filenameOfLength = (length: number) =>
    `app:///${"a".repeat(length - "app:///.js".length)}.js`;
  const urlOfLength = (length: number) => `/${"a".repeat(length - 1)}`;

  it("ファイル名: 4095・4096文字は通し、4097文字は送らない", () => {
    expect(filenameOfLength(4095)).toHaveLength(4095);
    expect(sanitizeFilename(filenameOfLength(4095))).toBe(
      filenameOfLength(4095)
    );
    expect(sanitizeFilename(filenameOfLength(4096))).toBe(
      filenameOfLength(4096)
    );
    expect(sanitizeFilename(filenameOfLength(4097))).toBe("[Filtered]");
  });

  it("URL: 4095・4096文字は通し、4097文字は送らない", () => {
    expect(sanitizeUrl(urlOfLength(4095))).toBe(urlOfLength(4095));
    expect(sanitizeUrl(urlOfLength(4096))).toBe(urlOfLength(4096));
    expect(sanitizeUrl(urlOfLength(4097))).toBe("[Filtered URL]");
    // 前後の空白は数えない(URL のみ)
    expect(sanitizeUrl(` ${urlOfLength(4096)} `)).toBe(urlOfLength(4096));
  });

  it("境界の長さでも、秘密を含む入力は置き換わる", () => {
    const pad = (head: string, length: number) =>
      head + "a".repeat(length - head.length);
    const url = sanitizeUrl(pad(`/password-reset/${NOSEP}/`, 4096));
    expect(url).not.toContain(NOSEP);
    expect(url.startsWith("/password-reset/[token]/")).toBe(true);
  });
});
