import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "@/app/components/SearchBar";

const mockEmotions = [
  { id: 1, name: "嬉しい" },
  { id: 2, name: "楽しい" },
  { id: 3, name: "悲しい" },
  { id: 4, name: "怖い" },
  { id: 5, name: "不思議" },
  { id: 6, name: "感動的" },
];

describe("SearchBar", () => {
  describe("基本表示", () => {
    it("キーワード入力欄が表示される", () => {
      render(<SearchBar emotions={mockEmotions} />);
      expect(screen.getByLabelText("ゆめの ことば")).toBeInTheDocument();
    });

    it("「くわしく さがす」ボタンが表示される", () => {
      render(<SearchBar emotions={mockEmotions} />);
      expect(screen.getByText("くわしく さがす")).toBeInTheDocument();
    });

    it("初期状態では日付・感情チップが非表示", () => {
      render(<SearchBar emotions={mockEmotions} />);
      expect(screen.queryByLabelText("いつから")).not.toBeInTheDocument();
      expect(screen.queryByText("😊 うれしい")).not.toBeInTheDocument();
    });
  });

  describe("詳細フィルターの展開", () => {
    it("「くわしく さがす」を押すと日付入力が表示される", async () => {
      const user = userEvent.setup();
      render(<SearchBar emotions={mockEmotions} />);
      await user.click(screen.getByText("くわしく さがす"));
      expect(screen.getByLabelText("いつから")).toBeInTheDocument();
      expect(screen.getByLabelText("いつまで")).toBeInTheDocument();
    });

    it("展開後に感情チップが表示される", async () => {
      const user = userEvent.setup();
      render(<SearchBar emotions={[{ id: 1, name: "嬉しい" }]} />);
      await user.click(screen.getByText("くわしく さがす"));
      expect(screen.getByText("😊 うれしい")).toBeInTheDocument();
    });

    it("展開後に「かんたんにする」ボタンに変わる", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      await user.click(screen.getByText("くわしく さがす"));
      expect(screen.getByText("かんたんにする")).toBeInTheDocument();
    });
  });

  describe("感情ラベルの子ども向け変換（展開後）", () => {
    async function expandAndRender(emotions) {
      const user = userEvent.setup();
      render(<SearchBar emotions={emotions} />);
      await user.click(screen.getByText("くわしく さがす"));
      return user;
    }

    it("嬉しい → 😊 うれしい と表示される", async () => {
      await expandAndRender([{ id: 1, name: "嬉しい" }]);
      expect(screen.getByText("😊 うれしい")).toBeInTheDocument();
    });

    it("楽しい → 😆 たのしい と表示される", async () => {
      await expandAndRender([{ id: 2, name: "楽しい" }]);
      expect(screen.getByText("😆 たのしい")).toBeInTheDocument();
    });

    it("怖い → 😰 こわい と表示される", async () => {
      await expandAndRender([{ id: 4, name: "怖い" }]);
      expect(screen.getByText("😰 こわい")).toBeInTheDocument();
    });

    it("全感情の生ラベルが表示されない", async () => {
      await expandAndRender(mockEmotions);
      mockEmotions.forEach(({ name }) => {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      });
    });
  });

  describe("日付プリセット（展開後）", () => {
    it("きょう・今週・今月 のプリセットボタンが表示される", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      await user.click(screen.getByText("くわしく さがす"));
      expect(screen.getByText("きょう")).toBeInTheDocument();
      expect(screen.getByText("今週")).toBeInTheDocument();
      expect(screen.getByText("今月")).toBeInTheDocument();
    });

    it("「きょう」ボタンを押すと開始日と終了日が同じ日付になる", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      await user.click(screen.getByText("くわしく さがす"));
      await user.click(screen.getByText("きょう"));
      const startInput = screen.getByLabelText("いつから");
      const endInput = screen.getByLabelText("いつまで");
      expect(startInput.value).not.toBe("");
      expect(startInput.value).toBe(endInput.value);
    });
  });
});
