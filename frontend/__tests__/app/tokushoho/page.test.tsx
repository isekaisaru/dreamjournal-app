import React from "react";
import { render, screen, within } from "@testing-library/react";

import TokushohoPage from "@/app/tokushoho/page";
import { SUPPORT_EMAIL } from "@/lib/site";

// 表の「項目名」に対応する説明（dd）を取り出す
const valueOf = (label: string) => {
  const term = screen.getByText(label, { selector: "dt" });
  const description = term.nextElementSibling;
  if (!(description instanceof HTMLElement)) {
    throw new Error(`${label} の説明が見つかりません`);
  }
  return description;
};

describe("特定商取引法に基づく表記ページ", () => {
  beforeEach(() => {
    render(<TokushohoPage />);
  });

  it("見出しがある", () => {
    expect(
      screen.getByRole("heading", { level: 1, name: /特定商取引法に基づく表記/ })
    ).toBeInTheDocument();
  });

  it.each(["販売事業者", "運営責任者", "所在地", "電話番号"])(
    "%s は請求があれば遅滞なく開示すると書く",
    (label) => {
      expect(valueOf(label)).toHaveTextContent("請求があった場合には遅滞なく開示いたします");
    }
  );

  it("メールアドレスは共通の問い合わせ先を使う", () => {
    const email = valueOf("メールアドレス");
    if (SUPPORT_EMAIL) {
      expect(within(email).getByRole("link", { name: SUPPORT_EMAIL })).toHaveAttribute(
        "href",
        `mailto:${SUPPORT_EMAIL}`
      );
    } else {
      expect(email).toHaveTextContent("準備中");
    }
  });

  it("販売価格は月額590円（税込）で、応援（寄付）は1回500円（税込）", () => {
    const price = valueOf("販売価格");
    expect(price).toHaveTextContent("月額590円（税込）");
    expect(price).toHaveTextContent("500円（税込）");
  });

  it("支払方法・支払時期・提供時期・必要料金を書く", () => {
    expect(valueOf("支払方法")).toHaveTextContent("クレジットカード");
    expect(valueOf("支払時期")).toHaveTextContent("毎月");
    expect(valueOf("サービスの提供時期")).toHaveTextContent("決済が完了した後");
    expect(valueOf("商品代金以外の必要料金")).toHaveTextContent("通信料");
  });

  it("解約の方法と返金の扱いを書く", () => {
    const cancel = valueOf("解約について");
    expect(cancel).toHaveTextContent("サブスクリプションを管理する");
    expect(cancel).toHaveTextContent("いつでも解約");
    expect(valueOf("返品・返金について")).toHaveTextContent("返金");
  });
});
