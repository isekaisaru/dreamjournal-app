import { shouldAllowAuthPageForUser } from "@/lib/authPageRedirect";

describe("shouldAllowAuthPageForUser", () => {
  it("trial user は /register を通過できる", () => {
    expect(shouldAllowAuthPageForUser("/register", { trial_user: true })).toBe(true);
  });

  it("trial user でも /login は従来どおり通過対象にしない", () => {
    expect(shouldAllowAuthPageForUser("/login", { trial_user: true })).toBe(false);
  });

  it("通常ユーザーは /register を通過対象にしない", () => {
    expect(shouldAllowAuthPageForUser("/register", { trial_user: false })).toBe(false);
  });

  it("ユーザー情報が読めない場合は /register を通過対象にしない", () => {
    expect(shouldAllowAuthPageForUser("/register", null)).toBe(false);
  });
});
