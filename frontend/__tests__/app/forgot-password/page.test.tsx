import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

const originalEnv = process.env;
const originalFetch = global.fetch;

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_VERCEL_ENV: "production" };
    delete process.env.NEXT_PUBLIC_API_URL;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("posts password reset requests through the production /proxy route", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), {
      target: { value: " user@example.com " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "リセットリンクを送信" })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/proxy/password_resets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        })
      );
    });
  });
});
