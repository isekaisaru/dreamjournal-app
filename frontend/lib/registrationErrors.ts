/**
 * 登録・トライアル昇格の失敗理由を、ユーザー向けのやさしい日本語に変換する。
 *
 * 【方針】
 * バックエンドは 422 のときに error_codes: [{ field, code }] を返す
 * （AuthService.validation_details / users_controller / auth_controller）。
 * ここでは英語のエラーメッセージを文字列解析せず、その field/code だけを見て
 * 文言を決める。通常登録（clientRegister）とトライアル昇格（convertTrial）で
 * 同じ変換処理を使うので、どちらの導線でも表示方針が揃う。
 *
 * 【フォールバック】
 * 次のときは内部情報を出さず、汎用メッセージを返す。
 *   - 422 以外（500・タイムアウト・通信失敗など）
 *   - error_codes が無い／配列でない／壊れている
 *   - 知らない field/code しか入っていない
 * バックエンドの error（英語混じりの人間向け文字列）は、そのままユーザーへ
 * 出すと分かりにくいので表示に使わない。
 *
 * 【apiClient に依存しない理由】
 * register ページのテストは "@/lib/apiClient" をモックしており、そのモックは
 * ApiError を持たない。instanceof で判定すると壊れるため、status / data の
 * 形だけを見る構造的な判定にしている。
 */

/** 理由が特定できないときに出す文言（従来と同じ） */
export const GENERIC_REGISTER_ERROR =
  "うまく はじめられなかったよ。もういちど ためしてね。";

type RegistrationErrorCode = { field: string; code: string };

/**
 * `field:code` をキーにした文言表。
 * ここに無い組み合わせは「知らないコード」として汎用メッセージへ倒す。
 */
const MESSAGE_BY_FIELD_CODE: Readonly<Record<string, string>> = {
  "email:taken":
    "その メールアドレスは もう つかわれているよ。ほかの メールアドレスを ためしてね。",
  "username:taken":
    "その ニックネームは もう つかわれているよ。ほかの なまえを ためしてね。",
  "email:blank": "メールアドレスを いれてね。",
  "username:blank": "ニックネームを いれてね。",
  "email:invalid": "メールアドレスの かたちを もういちど みてみてね。",
  "password:blank": "パスワードを いれてね。",
  "password:too_short": "パスワードは 8もじ いじょうで いれてね。",
  "password:invalid": "パスワードに えいじ（a〜z）と すうじ（0〜9）を いれてね。",
  "password_confirmation:confirmation":
    "パスワードが ちがっているみたい。もういちど みてみよう。",
};

/** エラーオブジェクトから、信頼できる形の error_codes だけを取り出す */
function extractErrorCodes(error: unknown): RegistrationErrorCode[] {
  if (typeof error !== "object" || error === null) return [];

  // 422（バリデーション）以外は理由を出さない
  const status = (error as { status?: unknown }).status;
  if (status !== 422) return [];

  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return [];

  const rawCodes = (data as { error_codes?: unknown }).error_codes;
  if (!Array.isArray(rawCodes)) return [];

  return rawCodes.filter((item): item is RegistrationErrorCode => {
    if (typeof item !== "object" || item === null) return false;
    const { field, code } = item as { field?: unknown; code?: unknown };
    return typeof field === "string" && typeof code === "string";
  });
}

/**
 * 失敗理由の文言を返す。複数の理由があるときは重複を除いて全部つなげる
 * （例: メールとニックネームが両方重複しているケース）。
 */
export function resolveRegistrationErrorMessage(error: unknown): string {
  const codes = extractErrorCodes(error);
  if (codes.length === 0) return GENERIC_REGISTER_ERROR;

  const messages = codes
    .map(({ field, code }) => MESSAGE_BY_FIELD_CODE[`${field}:${code}`])
    .filter((message): message is string => Boolean(message));

  const uniqueMessages = Array.from(new Set(messages));
  if (uniqueMessages.length === 0) return GENERIC_REGISTER_ERROR;

  return uniqueMessages.join(" ");
}
