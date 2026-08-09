import {
  GENERIC_REGISTER_ERROR,
  resolveRegistrationErrorMessage,
} from "@/lib/registrationErrors";

// バックエンドの422レスポンスを ApiError 相当の形で組み立てる
// （apiClient は errorData 全体を error.data に格納する）
function apiError(status: number, data?: unknown) {
  return { status, data };
}

describe("resolveRegistrationErrorMessage", () => {
  describe("422: field/code から理由を出し分ける", () => {
    it("メールアドレス重複を専用メッセージにする", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, { error_codes: [{ field: "email", code: "taken" }] })
      );

      expect(message).toContain("メールアドレス");
      expect(message).toContain("もう つかわれている");
      expect(message).not.toBe(GENERIC_REGISTER_ERROR);
    });

    it("ニックネーム重複を専用メッセージにする", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, { error_codes: [{ field: "username", code: "taken" }] })
      );

      expect(message).toContain("ニックネーム");
      expect(message).toContain("もう つかわれている");
      expect(message).not.toBe(GENERIC_REGISTER_ERROR);
    });

    it("両方重複しているときは両方の理由を出す", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, {
          error_codes: [
            { field: "email", code: "taken" },
            { field: "username", code: "taken" },
          ],
        })
      );

      expect(message).toContain("メールアドレス");
      expect(message).toContain("ニックネーム");
    });

    it("パスワードが短いときは文字数の案内を出す", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, { error_codes: [{ field: "password", code: "too_short" }] })
      );

      expect(message).toContain("8もじ");
    });

    it("パスワードに英数字が足りないときはその案内を出す", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, { error_codes: [{ field: "password", code: "invalid" }] })
      );

      expect(message).toContain("えいじ");
      expect(message).toContain("すうじ");
    });

    it("同じ理由が重複して返ってきても文言は1つ分だけになる", () => {
      const single = resolveRegistrationErrorMessage(
        apiError(422, { error_codes: [{ field: "email", code: "taken" }] })
      );
      const duplicated = resolveRegistrationErrorMessage(
        apiError(422, {
          error_codes: [
            { field: "email", code: "taken" },
            { field: "email", code: "taken" },
          ],
        })
      );

      expect(duplicated).toBe(single);
    });
  });

  describe("フォールバック: 内部情報を出さず汎用メッセージにする", () => {
    it("500では汎用メッセージ", () => {
      expect(
        resolveRegistrationErrorMessage(apiError(500, { error: "Internal Server Error" }))
      ).toBe(GENERIC_REGISTER_ERROR);
    });

    it("504（タイムアウト）でも汎用メッセージ", () => {
      expect(resolveRegistrationErrorMessage(apiError(504))).toBe(
        GENERIC_REGISTER_ERROR
      );
    });

    it("通信失敗（status を持たないError）でも汎用メッセージ", () => {
      expect(resolveRegistrationErrorMessage(new Error("Network request failed"))).toBe(
        GENERIC_REGISTER_ERROR
      );
    });

    it("422でも error_codes が無ければ汎用メッセージ", () => {
      expect(
        resolveRegistrationErrorMessage(
          apiError(422, { error: "Email has already been taken" })
        )
      ).toBe(GENERIC_REGISTER_ERROR);
    });

    it("error_codes が配列でない壊れたレスポンスでも汎用メッセージ", () => {
      expect(
        resolveRegistrationErrorMessage(apiError(422, { error_codes: "broken" }))
      ).toBe(GENERIC_REGISTER_ERROR);
    });

    it("知らない field/code しか無いときは汎用メッセージ", () => {
      expect(
        resolveRegistrationErrorMessage(
          apiError(422, { error_codes: [{ field: "unknown_field", code: "weird" }] })
        )
      ).toBe(GENERIC_REGISTER_ERROR);
    });

    it("要素の形が壊れていても落ちずに汎用メッセージ", () => {
      expect(
        resolveRegistrationErrorMessage(
          apiError(422, { error_codes: [null, 42, { field: "email" }] })
        )
      ).toBe(GENERIC_REGISTER_ERROR);
    });

    it("null / undefined でも落ちずに汎用メッセージ", () => {
      expect(resolveRegistrationErrorMessage(null)).toBe(GENERIC_REGISTER_ERROR);
      expect(resolveRegistrationErrorMessage(undefined)).toBe(GENERIC_REGISTER_ERROR);
    });

    it("バックエンドの error 文字列はそのまま表示しない", () => {
      const message = resolveRegistrationErrorMessage(
        apiError(422, {
          error: "Email has already been taken",
          error_codes: [{ field: "email", code: "taken" }],
        })
      );

      expect(message).not.toContain("Email has already been taken");
    });
  });
});
