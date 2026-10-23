import { ApiError, apiFetch } from "../../lib/apiClient";
import {
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  isNetworkError,
  isTimeoutError,
  toFriendlyErrorMessage,
} from "../../lib/friendlyErrors";

describe("toFriendlyErrorMessage", () => {
  it("apiClient のタイムアウト ApiError をやさしい日本語にする", () => {
    const error = new ApiError("API request to /dreams/1 timed out after 15s.");
    error.status = 504;

    expect(toFriendlyErrorMessage(error)).toBe(TIMEOUT_ERROR_MESSAGE);
  });

  it("useDream のようにメッセージ文字列だけ渡されても変換する", () => {
    expect(
      toFriendlyErrorMessage("API request to /dreams/1 timed out after 15s.")
    ).toBe(TIMEOUT_ERROR_MESSAGE);
  });

  it("バックエンドや API ルートの英語タイムアウト文言も変換する", () => {
    expect(toFriendlyErrorMessage("Request timed out after 10s")).toBe(
      TIMEOUT_ERROR_MESSAGE
    );
    expect(
      toFriendlyErrorMessage("Backend request timed out. Please retry.")
    ).toBe(TIMEOUT_ERROR_MESSAGE);
  });

  it("status 504 はメッセージに関わらずタイムアウト扱いにする", () => {
    expect(
      toFriendlyErrorMessage({ status: 504, message: "Gateway Time-out" })
    ).toBe(TIMEOUT_ERROR_MESSAGE);
  });

  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
    "Network request failed",
  ])("通信失敗 (%s) をやさしい日本語にする", (message) => {
    expect(toFriendlyErrorMessage(new TypeError(message))).toBe(
      NETWORK_ERROR_MESSAGE
    );
  });

  it("タイムアウト・通信失敗以外は元のメッセージをそのまま返す", () => {
    expect(toFriendlyErrorMessage("ログインが必要です")).toBe(
      "ログインが必要です"
    );
    expect(toFriendlyErrorMessage(new Error("Dream not found"))).toBe(
      "Dream not found"
    );
    expect(
      toFriendlyErrorMessage(
        new ApiError("API request to /dreams/1 failed with status 500.")
      )
    ).toBe("API request to /dreams/1 failed with status 500.");
  });

  it("メッセージが取り出せないときは fallback を返す", () => {
    expect(toFriendlyErrorMessage(undefined, "しっぱい しました")).toBe(
      "しっぱい しました"
    );
    expect(toFriendlyErrorMessage(null)).toBe("");
    expect(toFriendlyErrorMessage("", "しっぱい しました")).toBe(
      "しっぱい しました"
    );
  });

  it("判定ヘルパーは無関係なエラーに反応しない", () => {
    expect(isTimeoutError(new Error("Dream not found"))).toBe(false);
    expect(isNetworkError(new Error("Dream not found"))).toBe(false);
  });
});

describe("apiFetch のタイムアウトエラー契約（変更しないこと）", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("英語メッセージと status 504 を保ったまま、表示層で日本語に変換できる", async () => {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockRejectedValue(abortError) as unknown as typeof fetch;

    let thrown: unknown;
    try {
      await apiFetch("/dreams/1");
    } catch (error) {
      thrown = error;
    }

    // 契約: apiClient 自体は従来どおり
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(504);
    expect((thrown as ApiError).message).toBe(
      "API request to /dreams/1 timed out after 15s."
    );
    // 表示層: ユーザーには日本語を出す
    expect(toFriendlyErrorMessage(thrown)).toBe(TIMEOUT_ERROR_MESSAGE);
  });
});
