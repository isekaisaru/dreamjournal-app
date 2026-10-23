/**
 * タイムアウト・通信失敗の英語メッセージを、画面に出す前にやさしい日本語へ置き換える。
 *
 * 【方針】
 * apiClient（apiFetch）が投げるエラーの message / status は、AuthContext・login・
 * テストなどが参照している契約なので変更しない。ここは「表示する直前」で
 * 文言だけ差し替える表示層のヘルパー。
 *
 *   - タイムアウト: ApiError("... timed out after 15s.") / status 504 など
 *   - 通信失敗:     fetch の TypeError（"Failed to fetch" / Safari の "Load failed" など）
 *   - 上記以外:     元のメッセージをそのまま返す（従来の表示を変えない）
 *
 * 【apiClient に依存しない理由】
 * ページのテストは "@/lib/apiClient" をモックしており ApiError を持たないことがある。
 * instanceof ではなく、status / message の形だけを見る構造的な判定にしている。
 */

/** タイムアウト時にユーザーへ見せる文言 */
export const TIMEOUT_ERROR_MESSAGE =
  "つながるのに じかんが かかっているよ。すこし まってから もういちど ためしてね。";

/** 通信失敗（オフライン等）時にユーザーへ見せる文言 */
export const NETWORK_ERROR_MESSAGE =
  "つながらなかったよ。ネットワークを たしかめて、もういちど ためしてね。";

const TIMEOUT_MESSAGE_PATTERN = /timed out|timeout/i;
const NETWORK_MESSAGE_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed/i;

function extractMessage(error: unknown): string | null {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}

export function isTimeoutError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const { status, name } = error as { status?: unknown; name?: unknown };
    if (status === 504 || name === "TimeoutError") return true;
  }
  const message = extractMessage(error);
  return message !== null && TIMEOUT_MESSAGE_PATTERN.test(message);
}

export function isNetworkError(error: unknown): boolean {
  const message = extractMessage(error);
  return message !== null && NETWORK_MESSAGE_PATTERN.test(message);
}

/**
 * 画面表示用のメッセージを返す。
 *
 * @param error  Error / ApiError / 文字列（useDream のように message を保持している場合）
 * @param fallback  message を取り出せないときの文言（省略時は空文字）
 */
export function toFriendlyErrorMessage(
  error: unknown,
  fallback = ""
): string {
  if (isTimeoutError(error)) return TIMEOUT_ERROR_MESSAGE;
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;

  const message = extractMessage(error);
  return message !== null && message !== "" ? message : fallback;
}
