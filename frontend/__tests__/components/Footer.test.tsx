import React from "react";
import { render, screen } from "@testing-library/react";

import Footer from "@/app/components/Footer";
import { SUPPORT_EMAIL } from "@/lib/site";

describe("Footer", () => {
  it("特定商取引法に基づく表記へのリンクがある", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表記" })
    ).toHaveAttribute("href", "/tokushoho");
  });

  it("プライバシーポリシーと利用規約へのリンクは残す", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "利用規約" })).toHaveAttribute("href", "/terms");
  });

  it("お問い合わせは、問い合わせ先メールがあればメールで受け付ける", () => {
    render(<Footer />);

    const contact = screen.getByRole("link", { name: "お問い合わせ" });
    if (SUPPORT_EMAIL) {
      expect(contact).toHaveAttribute("href", `mailto:${SUPPORT_EMAIL}`);
    } else {
      expect(contact).toHaveAttribute("href", "/tokushoho");
    }
  });
});
