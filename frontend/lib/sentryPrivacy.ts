/**
 * Sentry へ送る前に、機密情報を取り除くための共通処理。
 *
 * - ブラウザ / Node.js / Edge のどこでも動く純粋関数だけで書く。
 *   Cookie・環境変数・DOM・ネットワークには触れず、`@sentry/*` も import しない。
 * - 方針は「許可リスト方式」。取り出してよいと決めた項目だけを新しいオブジェクトに
 *   写し取り、それ以外は理由を問わず捨てる(入力は一切変更しない)。
 *   任意の文字列(例外メッセージ・追加データ・夢本文など)は、中身を見て消すのではなく、
 *   最初から「送らないもの」として扱う。
 * - 処理中に何かが失敗したら、生データを返さず null(= 送らない)に倒す。
 *
 * まだ Sentry の初期化設定にはつないでいない(つなぐのは次のPR)。
 */

export const FILTERED = "[Filtered]";
export const FILTERED_URL = "[Filtered URL]";
export const FILTERED_MESSAGE = "[Filtered message]";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

// 英数字・記号の短い識別子(種別名・バージョン・環境名など)だけを通す。
const SAFE_SHORT_TEXT = /^[\w.@+\-/ ]{1,200}$/;
// category / type / mechanism.type のような名前。
const SAFE_NAME = /^[\w.\-]{1,64}$/;
// 例外の type は、形で判定せず「既知の名前」だけを通す(それ以外は "Error")。
// 形が識別子らしいだけでは、トークンや独自に付けた名前を区別できないため。
// ApiError はこのアプリの lib/apiClient.ts のクラス。
const SAFE_EXCEPTION_TYPES = new Set([
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "AggregateError",
  "DOMException",
  "ApiError",
  "AbortError",
  "TimeoutError",
  "NetworkError",
  "UnhandledRejection",
]);
// mechanism.type は、SDK が実際に設定する値だけを通す(それ以外は SDK の既定値 "generic")。
// 根拠: インストール済みの @sentry/* 10.75.2 のソースにあるリテラル。
// - generic: core/utils/eventbuilder の既定値 / chained: 連鎖した例外
// - auto.core.linked_errors: core/utils/aggregate-errors が連鎖・集約された例外の親に付ける値
// - ブラウザ: browser の global_handlers(onerror / onunhandledrejection)と web_worker
// - Node: node-core の onunhandledrejection / onuncaughtexception
// - React: error_boundary / error_handler
// - Next.js: nextjs の wrap* / on_request_error / server_component / server_action など
// - onerror / onunhandledrejection: 旧版の SDK が使っていた名前(名前空間なし)
// 対象はこのアプリで使う範囲(ブラウザ・Node・Next.js・React)。express / tRPC / AI 系などの
// 統合は使っていないので含めない。SDK を更新したら、この一覧も見直す。
const SAFE_MECHANISM_TYPES = new Set([
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
  "auto.core.linked_errors",
  "auto.function.react.error_boundary",
  "auto.function.react.error_handler",
  "auto.function.nextjs.data_fetcher",
  "auto.function.nextjs.generation_function",
  "auto.function.nextjs.on_request_error",
  "auto.function.nextjs.page_class",
  "auto.function.nextjs.page_function",
  "auto.function.nextjs.route_handler",
  "auto.function.nextjs.server_action",
  "auto.function.nextjs.server_component",
  "auto.function.nextjs.underscore_error",
  "auto.function.nextjs.wrap_api_handler",
  "auto.function.nextjs.wrap_middleware",
  "auto.function.nextjs.wrapped",
  "auto.http.nextjs.api_handler",
]);
const SAFE_LEVELS = new Set([
  "fatal",
  "error",
  "warning",
  "log",
  "info",
  "debug",
]);
const HEX_ID = /^[a-f0-9]{16,32}$/i;

function safeText(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

function assign(target: UnknownRecord, key: string, value: unknown): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

// ---------------------------------------------------------------------------
// URL
// ---------------------------------------------------------------------------

// このアプリでパスの中にトークンが入る URL の直前の部分。
// 例: /password-reset/<token>(画面)・/password_resets/<token>(API)
const TOKEN_PARENT_SEGMENTS = new Set([
  "password-reset",
  "password_reset",
  "password-resets",
  "password_resets",
  "reset-password",
  "verify-email",
  "verify_email",
  "email-verification",
  "email_verification",
]);

const OPAQUE_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
const JWT_LIKE_SEGMENT =
  /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;

// 保険: 上のルールに載っていなくても、長くて数字を含む英数字の塊や JWT 形式は
// トークンの可能性が高いので置き換える。
function looksOpaque(segment: string): boolean {
  return (
    (OPAQUE_SEGMENT.test(segment) && /\d/.test(segment)) ||
    JWT_LIKE_SEGMENT.test(segment)
  );
}

// メールアドレスらしい形(name@example.com)。`next@16.4.1` のような版番号の表記は含めない
// (最後の部分が英字2文字以上であることを必須にしている)。
const EMAIL_LIKE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\b/;

// `%E3%82%86…`(日本語など)や `%40`(@)のように、人の入力だった可能性のある
// パーセントエンコード。デコードできない壊れた形も、安全側に倒して対象にする。
function looksLikeEncodedText(segment: string): boolean {
  if (!/%[0-9A-Fa-f]{2}/.test(segment)) return false;
  try {
    const decoded = decodeURIComponent(segment);
    return /[^\x21-\x7E]/.test(decoded) || EMAIL_LIKE.test(decoded);
  } catch {
    return true;
  }
}

const MAX_DECODE_ROUNDS = 3;

// 親パス名を `%70assword-reset` や `password%2Dreset` のようにエンコードして隠しても
// 見落とさないよう、照合専用に ASCII の %XX だけを(多重エンコードも含めて)戻して
// 小文字にそろえる。`%2F` / `%5C` で区切りが1つの区間に押し込まれた場合は分割する。
// 結果は照合にだけ使い、出力には使わない。壊れたマルチバイトがあっても例外にならない。
// 戻す回数には上限があり(処理量を一定に保つため)、上限まで戻してもまだ戻せる %XX が
// 残る(= 4重以上にエンコードされている)ものは、中身を判断できないので undecidable とする。
function comparable(segment: string): {
  parts: string[];
  undecidable: boolean;
} {
  let current = segment;
  for (
    let round = 0;
    round < MAX_DECODE_ROUNDS && /%[0-7][0-9A-Fa-f]/.test(current);
    round += 1
  ) {
    current = current.replace(/%([0-7][0-9A-Fa-f])/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
  return {
    parts: current.toLowerCase().split(/[/\\]/),
    undecidable: /%[0-7][0-9A-Fa-f]/.test(current),
  };
}

// 区間の中の `;` 以降(パスパラメータ: `password-reset;token=…`)。親パス名の照合では外して見る。
const withoutParams = (part: string): string => part.split(";")[0];

// 親パスの直後でも、値ではなくソースコード上の名前であることが明らかなものは置き換えない。
// - Next.js が決めた固定のファイル名(page.tsx / route.ts / layout.tsx など)と、
//   そのビルド後のチャンク名(page-<16進>.js)
// - ルートの動的区間の表記(`[token]` / `[profileId]` / `[...slug]`)。短い識別子だけで、
//   長い値を角括弧でくるんだものは対象外。
// どれも秘密の値になりえない(サーバーが発行するトークンがこの形になることはない)。
const NEXT_FILE_STEMS =
  "page|layout|route|loading|error|global-error|not-found|template|default";
const KNOWN_SOURCE_NAME = new RegExp(
  `^(?:(?:${NEXT_FILE_STEMS}|index)\\.(?:tsx?|jsx?|mjs|cjs)|(?:${NEXT_FILE_STEMS})-[0-9a-f]{8,32}\\.m?js)$`
);
const ROUTE_PLACEHOLDER = /^\[(?:\.\.\.)?[A-Za-z][A-Za-z0-9]{0,15}\]$/;

function classifySegment(segment: string): string {
  if (EMAIL_LIKE.test(segment)) return "[email]";
  if (looksLikeEncodedText(segment)) return "[encoded]";
  if (looksOpaque(segment)) return "[id]";
  return segment;
}

// `;` 以降(パスパラメータ)は値が機密でありうるので送らない。`;` の位置が分かるときは
// その手前までを残し、多重エンコードされていて位置を特定できないときは固定値にする。
// 通常の `;` と `%253B` のような多重エンコードの `;` が混在すると、先に見つかった通常の `;` で
// 切っても手前にエンコードされた `;` と値が残るので、残す部分も照合用の正規化で確かめる。
function dropPathParams(segment: string): string {
  const index = segment.search(/;|%3[Bb]/);
  const kept = index === -1 ? "" : segment.slice(0, index);
  const { parts, undecidable } = comparable(kept);
  const hidden = undecidable || parts.some((part) => part.includes(";"));
  return kept === "" || hidden ? "[params]" : classifySegment(kept);
}

function sanitizePath(pathname: string): string {
  let afterTokenParent = false;

  return pathname
    .split("/")
    .map((segment) => {
      if (segment === "") {
        afterTokenParent = false;
        return segment;
      }

      const { parts, undecidable } = comparable(segment);
      const names = parts.map(withoutParams);
      // 親パス名とトークンが1つの区間に入っている(例: password-reset%2F<token>)
      const hidesToken = names
        .slice(0, -1)
        .some((name) => TOKEN_PARENT_SEGMENTS.has(name));
      const lastName = names.filter((name) => name !== "").pop() ?? "";
      const hasParams = parts.some((part) => part.includes(";"));
      const isSourceName =
        !undecidable &&
        !hasParams &&
        parts.length === 1 &&
        (KNOWN_SOURCE_NAME.test(parts[0]) || ROUTE_PLACEHOLDER.test(parts[0]));

      let result: string;
      if ((afterTokenParent && !isSourceName) || hidesToken) {
        result = "[token]";
      } else if (undecidable) {
        result = "[encoded]";
      } else if (hasParams) {
        result = dropPathParams(segment);
      } else {
        result = classifySegment(segment);
      }
      // 判断できなかった区間は親パスだったかもしれないので、直後も置き換える側に倒す。
      afterTokenParent = undecidable || TOKEN_PARENT_SEGMENTS.has(lastName);
      return result;
    })
    .join("/");
}

const URL_SCHEME = /^[A-Za-z][A-Za-z\d+.-]*:/;
const WEB_SCHEME = /^(https?|wss?):/i;
// 相対 URL を解釈するための、実在しないダミーの土台。出力には使わない。
const RELATIVE_URL_BASE = "http://relative.invalid";

/**
 * URL を送ってよい形に変える。
 * - クエリ・fragment・userinfo(user:pass@)は捨てる
 * - パスの中のトークンは `[token]` / `[id]` に置き換える
 * - 絶対 URL / 相対 URL / `/proxy/...` のどれでも使える
 * - 解釈できない・http(s)/ws(s) 以外のものは固定文字列にする
 */
export function sanitizeUrl(input: unknown): string {
  try {
    if (typeof input !== "string") return FILTERED_URL;
    const trimmed = input.trim();
    if (trimmed.length === 0 || trimmed.length > 4096) return FILTERED_URL;

    const hasScheme = URL_SCHEME.test(trimmed);
    if (hasScheme && !WEB_SCHEME.test(trimmed)) return FILTERED_URL;

    const parsed = new URL(trimmed, RELATIVE_URL_BASE);
    const path = sanitizePath(parsed.pathname);

    if (hasScheme) {
      return `${parsed.protocol}//${parsed.host}${path}`;
    }
    if (trimmed.startsWith("//")) {
      return `//${parsed.host}${path}`;
    }
    return path;
  } catch {
    return FILTERED_URL;
  }
}

const FILENAME_SCHEME_PREFIX = /^[A-Za-z][\w+.-]*:\/{2,3}/;

// 絶対パスの先頭にあるホームディレクトリ(/Users/<名前>/ ・ /home/<名前>/)のユーザー名。
// 先頭に固定しているので、ソース内の `app/home/...` のような名前は変えない。
// 本番(Vercel など)のパスは /var/task/... でホームを含まないため、ソースマップの照合には影響しない。
const HOME_DIR_USER = /^(\/(?:Users|home)\/)[^/]+(?=\/)/;
const FILE_URL_PREFIX = /^file:\/\//i;

/** スタックトレースのファイル名用。クエリを除き、コード上の場所を表す形だけ残す。 */
export function sanitizeFilename(input: unknown): string {
  // sanitizeUrl と同じ上限。長すぎる入力は、検査(正規表現)の負荷を避けるため中身を見ずに送らない。
  if (typeof input !== "string" || input.length > 4096) return FILTERED;

  const unquery = input.split(/[?#]/)[0];
  const fileScheme = FILE_URL_PREFIX.exec(unquery)?.[0] ?? "";
  const base =
    fileScheme +
    unquery.slice(fileScheme.length).replace(HOME_DIR_USER, "$1[user]");
  if (/^(https?|wss?):\/\//i.test(base) || base.startsWith("/")) {
    return sanitizeUrl(base);
  }
  // メールアドレスや日本語などのエンコード文字列が紛れた名前は、コード上の場所ではないので送らない。
  if (EMAIL_LIKE.test(base) || looksLikeEncodedText(base)) return FILTERED;
  // app:///_next/... や webpack-internal:///... のようなアプリ内の名前。
  // 形が正しいものでも、パス部分は URL と同じ規則(再設定トークン・長い塊の置き換え)を通す。
  const scheme = FILENAME_SCHEME_PREFIX.exec(base)?.[0];
  if (scheme !== undefined) {
    const rest = base.slice(scheme.length);
    return /^[\w\-./[\]()@~%+]*$/.test(rest)
      ? `${scheme}${sanitizePath(rest)}`
      : FILTERED;
  }
  return /^[\w\-./[\]()@~%+ ]{1,300}$/.test(base)
    ? sanitizePath(base)
    : FILTERED;
}

function sanitizeTransactionName(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;

  const withMethod = /^([A-Z]{3,7}) (\/.*)$/.exec(input);
  if (withMethod) {
    return `${withMethod[1]} ${sanitizeUrl(withMethod[2])}`;
  }
  if (input.startsWith("/") || WEB_SCHEME.test(input)) {
    return sanitizeUrl(input);
  }
  return FILTERED;
}

// ---------------------------------------------------------------------------
// 例外メッセージ
// ---------------------------------------------------------------------------

const SAFE_EXACT_MESSAGES = new Set([
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource.",
  "The operation was aborted.",
  "signal is aborted without reason",
  "ResizeObserver loop completed with undelivered notifications.",
  "Text content does not match server-rendered HTML.",
]);

const HYDRATION_PREFIX =
  "Hydration failed because the server rendered HTML didn't match the client.";

const IDENTIFIER = "[A-Za-z_$][\\w$]{0,39}";
const API_FAILED_MESSAGE =
  /^API request to (\S+) failed with status (\d{3})\.$/;
const API_TIMEOUT_MESSAGE =
  /^API request to (\S+) timed out after (\d+(?:\.\d+)?)s\.$/;
const READ_PROPERTY_MESSAGE = new RegExp(
  `^Cannot read properties of (undefined|null) \\(reading '(${IDENTIFIER})'\\)$`
);
const NOT_A_FUNCTION_MESSAGE = new RegExp(
  `^(${IDENTIFIER}(?:\\.${IDENTIFIER}){0,4}) is not (a function|defined|iterable|a constructor)$`
);
const REACT_MINIFIED_MESSAGE = /^Minified React error #(\d{1,4})\b/;

/**
 * 例外メッセージを送ってよい形に変える。
 * 夢本文・メール・トークンが混ざりうる自由な文章は送らない。
 * 中身を調べて消すのではなく、「安全だと分かっている定型文」だけを通す。
 */
export function sanitizeMessage(input: unknown): string {
  try {
    if (typeof input !== "string") return FILTERED_MESSAGE;
    const message = input.trim();
    if (message.length === 0 || message.length > 2000) return FILTERED_MESSAGE;

    if (SAFE_EXACT_MESSAGES.has(message)) return message;
    if (message.startsWith(HYDRATION_PREFIX)) return HYDRATION_PREFIX;

    let match = API_FAILED_MESSAGE.exec(message);
    if (match) {
      return `API request to ${sanitizeUrl(match[1])} failed with status ${match[2]}.`;
    }
    match = API_TIMEOUT_MESSAGE.exec(message);
    if (match) {
      return `API request to ${sanitizeUrl(match[1])} timed out after ${match[2]}s.`;
    }
    // 変数名やプロパティ名に見える部分も、トークン風(長くて数字を含む)なら送らない。
    // 例: map[token].x が失敗すると、トークンそのものが "reading '…'" に入りうる。
    match = READ_PROPERTY_MESSAGE.exec(message);
    if (match) {
      const property = looksOpaque(match[2]) ? "[id]" : match[2];
      return `Cannot read properties of ${match[1]} (reading '${property}')`;
    }
    match = NOT_A_FUNCTION_MESSAGE.exec(message);
    if (match) {
      const name = match[1].split(".").some(looksOpaque) ? "[id]" : match[1];
      return `${name} is not ${match[2]}`;
    }
    match = REACT_MINIFIED_MESSAGE.exec(message);
    if (match) {
      return `Minified React error #${match[1]}`;
    }
    return FILTERED_MESSAGE;
  } catch {
    return FILTERED_MESSAGE;
  }
}

// ---------------------------------------------------------------------------
// 例外(連鎖した例外を含む)
// ---------------------------------------------------------------------------

const MAX_EXCEPTIONS = 10;
const MAX_FRAMES = 100;

function sanitizeFrame(frame: unknown): UnknownRecord | undefined {
  if (!isRecord(frame)) return undefined;

  // vars(変数の中身)と context_line / pre_context / post_context(ソース行)は送らない。
  // function / module も送らない。関数名や module 名は動的に生成された名前や
  // パス由来の文字列(トークンを含みうる)になりえ、安全だと断定できないため。
  // 場所は filename / lineno / colno で分かる。
  const out: UnknownRecord = {};
  if (frame.filename !== undefined) {
    assign(out, "filename", sanitizeFilename(frame.filename));
  }
  if (frame.abs_path !== undefined) {
    assign(out, "abs_path", sanitizeFilename(frame.abs_path));
  }
  assign(out, "lineno", finiteNumber(frame.lineno));
  assign(out, "colno", finiteNumber(frame.colno));
  assign(
    out,
    "in_app",
    typeof frame.in_app === "boolean" ? frame.in_app : undefined
  );
  return out;
}

function sanitizeException(exception: unknown): UnknownRecord | undefined {
  if (!isRecord(exception)) return undefined;

  const out: UnknownRecord = {
    type:
      typeof exception.type === "string" &&
      SAFE_EXCEPTION_TYPES.has(exception.type)
        ? exception.type
        : "Error",
    value: sanitizeMessage(exception.value),
  };

  if (isRecord(exception.mechanism)) {
    const mechanism: UnknownRecord = {};
    if (exception.mechanism.type !== undefined) {
      mechanism.type =
        typeof exception.mechanism.type === "string" &&
        SAFE_MECHANISM_TYPES.has(exception.mechanism.type)
          ? exception.mechanism.type
          : "generic";
    }
    assign(
      mechanism,
      "handled",
      typeof exception.mechanism.handled === "boolean"
        ? exception.mechanism.handled
        : undefined
    );
    out.mechanism = mechanism;
  }

  if (
    isRecord(exception.stacktrace) &&
    Array.isArray(exception.stacktrace.frames)
  ) {
    const frames = exception.stacktrace.frames
      .slice(-MAX_FRAMES)
      .map(sanitizeFrame)
      .filter((frame): frame is UnknownRecord => frame !== undefined);
    out.stacktrace = { frames };
  }
  return out;
}

// ---------------------------------------------------------------------------
// breadcrumb
// ---------------------------------------------------------------------------

const MAX_BREADCRUMBS = 100;
const HTTP_METHOD = /^[A-Z]{3,7}$/;

function sanitizeBreadcrumbValue(breadcrumb: unknown): UnknownRecord | null {
  if (!isRecord(breadcrumb)) return null;

  const category = safeText(breadcrumb.category, SAFE_NAME);
  // 大文字小文字の違い(Console など)で取りこぼさないよう、比較は小文字にそろえて行う。
  const kind = category?.toLowerCase();
  // console は生の引数、ui.input は入力された値が入るので、まるごと捨てる。
  if (kind === "console" || kind === "ui.input") return null;

  const out: UnknownRecord = {};
  assign(out, "category", category);
  assign(out, "type", safeText(breadcrumb.type, SAFE_NAME));
  assign(out, "timestamp", finiteNumber(breadcrumb.timestamp));
  assign(
    out,
    "level",
    typeof breadcrumb.level === "string" && SAFE_LEVELS.has(breadcrumb.level)
      ? breadcrumb.level
      : undefined
  );

  // message(セレクタ文字列・自由文)は常に捨てる。data は下の2種類だけ、中身を限って残す。
  if (kind === "navigation" && isRecord(breadcrumb.data)) {
    const data: UnknownRecord = {};
    if (breadcrumb.data.from !== undefined) {
      data.from = sanitizeUrl(breadcrumb.data.from);
    }
    if (breadcrumb.data.to !== undefined) {
      data.to = sanitizeUrl(breadcrumb.data.to);
    }
    out.data = data;
  } else if (
    (kind === "fetch" || kind === "xhr") &&
    isRecord(breadcrumb.data)
  ) {
    const data: UnknownRecord = {};
    assign(data, "method", safeText(breadcrumb.data.method, HTTP_METHOD));
    if (breadcrumb.data.url !== undefined) {
      data.url = sanitizeUrl(breadcrumb.data.url);
    }
    assign(data, "status_code", finiteNumber(breadcrumb.data.status_code));
    out.data = data;
  }
  return out;
}

/** breadcrumb を送ってよい形に変える。捨てるべきもの・処理に失敗したものは null。 */
export function sanitizeBreadcrumb<T extends object>(breadcrumb: T): T | null {
  try {
    return sanitizeBreadcrumbValue(breadcrumb) as unknown as T | null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// イベント全体
// ---------------------------------------------------------------------------

const SAFE_TAG_KEYS = new Set([
  "handled",
  "mechanism",
  "runtime",
  "browser.name",
  "os.name",
]);
const SAFE_TAG_VALUE = /^[\w.\- ]{1,64}$/;

function sanitizeTags(tags: unknown): UnknownRecord | undefined {
  if (!isRecord(tags)) return undefined;

  const out: UnknownRecord = {};
  for (const key of Object.keys(tags)) {
    if (!SAFE_TAG_KEYS.has(key)) continue;
    const value = tags[key];
    if (typeof value === "string" && SAFE_TAG_VALUE.test(value)) {
      out[key] = value;
    } else if (
      typeof value === "boolean" ||
      finiteNumber(value) !== undefined
    ) {
      out[key] = value;
    }
  }
  return out;
}

function sanitizeNameVersion(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;
  const out: UnknownRecord = {};
  assign(out, "name", safeText(value.name, SAFE_SHORT_TEXT));
  assign(out, "version", safeText(value.version, SAFE_SHORT_TEXT));
  return out;
}

function sanitizeContexts(contexts: unknown): UnknownRecord | undefined {
  if (!isRecord(contexts)) return undefined;

  // 独自に足された contexts は中身を保証できないので捨てる。標準の4種類だけ残す。
  const out: UnknownRecord = {};
  assign(out, "browser", sanitizeNameVersion(contexts.browser));
  assign(out, "os", sanitizeNameVersion(contexts.os));
  assign(out, "runtime", sanitizeNameVersion(contexts.runtime));

  if (isRecord(contexts.trace)) {
    const trace: UnknownRecord = {};
    assign(trace, "trace_id", safeText(contexts.trace.trace_id, HEX_ID));
    assign(trace, "span_id", safeText(contexts.trace.span_id, HEX_ID));
    assign(
      trace,
      "parent_span_id",
      safeText(contexts.trace.parent_span_id, HEX_ID)
    );
    assign(trace, "op", safeText(contexts.trace.op, SAFE_NAME));
    assign(trace, "status", safeText(contexts.trace.status, SAFE_NAME));
    out.trace = trace;
  }
  return out;
}

function sanitizeRequest(request: unknown): UnknownRecord | undefined {
  if (!isRecord(request)) return undefined;

  // headers(Cookie / Authorization / Referer)・cookies・data・query_string は送らない。
  const out: UnknownRecord = {};
  if (request.url !== undefined) {
    out.url = sanitizeUrl(request.url);
  }
  assign(out, "method", safeText(request.method, HTTP_METHOD));
  return out;
}

function sanitizeBreadcrumbs(
  breadcrumbs: unknown
): UnknownRecord[] | undefined {
  const list = Array.isArray(breadcrumbs)
    ? breadcrumbs
    : isRecord(breadcrumbs) && Array.isArray(breadcrumbs.values)
      ? breadcrumbs.values
      : undefined;
  if (!list) return undefined;

  return list
    .slice(-MAX_BREADCRUMBS)
    .map(sanitizeBreadcrumbValue)
    .filter((item): item is UnknownRecord => item !== null);
}

function sanitizeEventValue(event: unknown): UnknownRecord | null {
  if (!isRecord(event)) return null;
  // エラー以外(transaction など)は、保護の方法がまだ決まっていないので送らない。
  if (event.type !== undefined && event.type !== "error") return null;

  const out: UnknownRecord = {};
  assign(out, "event_id", safeText(event.event_id, HEX_ID));
  assign(out, "timestamp", finiteNumber(event.timestamp));
  assign(out, "platform", safeText(event.platform, SAFE_NAME));
  assign(
    out,
    "level",
    typeof event.level === "string" && SAFE_LEVELS.has(event.level)
      ? event.level
      : undefined
  );
  assign(out, "release", safeText(event.release, SAFE_SHORT_TEXT));
  assign(out, "environment", safeText(event.environment, SAFE_SHORT_TEXT));
  assign(out, "dist", safeText(event.dist, SAFE_SHORT_TEXT));
  assign(out, "transaction", sanitizeTransactionName(event.transaction));
  if (event.message !== undefined) {
    out.message = sanitizeMessage(event.message);
  }
  assign(out, "tags", sanitizeTags(event.tags));
  assign(out, "contexts", sanitizeContexts(event.contexts));
  assign(out, "request", sanitizeRequest(event.request));
  assign(out, "breadcrumbs", sanitizeBreadcrumbs(event.breadcrumbs));

  const sdk = sanitizeNameVersion(event.sdk);
  assign(out, "sdk", sdk);

  const exception = event.exception;
  if (isRecord(exception) && Array.isArray(exception.values)) {
    out.exception = {
      values: exception.values
        .slice(-MAX_EXCEPTIONS)
        .map(sanitizeException)
        .filter((value): value is UnknownRecord => value !== undefined),
    };
  }

  // user / extra / server_name / fingerprint / spans などの上記以外の項目は、
  // 許可リストに無いのでここで自然に捨てられる。
  return out;
}

/**
 * Sentry のエラーイベントを送ってよい形に変える(`beforeSend` から使う想定)。
 * 入力は変更せず、新しいオブジェクトを返す。処理に失敗したときは null(= 送らない)。
 */
export function sanitizeEvent<T extends object>(event: T): T | null {
  try {
    return sanitizeEventValue(event) as unknown as T | null;
  } catch {
    return null;
  }
}
