import React from "react";
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import RecordTestPage from "@/app/debug/record-test/page";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// /debug/record-test は録音の不具合を調べるための開発用ページ。
// 本番で誰でも開けると、英語のテスト画面と録音ボタンが利用者に見えてしまう（2026-11-25 に本番で確認）。
describe("録音テスト用ページ（/debug/record-test）", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("本番では 404 にする", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");

    expect(() => RecordTestPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("開発中は録音テストを表示する", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "development");

    render(<RecordTestPage />);

    expect(screen.getByText("Minimal Recorder Test")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
