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
  describe("感情ラベルの子ども向け変換", () => {
    it("嬉しい → 😊 うれしい と表示される", () => {
      render(<SearchBar emotions={[{ id: 1, name: "嬉しい" }]} />);
      expect(screen.getByText("😊 うれしい")).toBeInTheDocument();
    });

    it("楽しい → 😆 たのしい と表示される", () => {
      render(<SearchBar emotions={[{ id: 2, name: "楽しい" }]} />);
      expect(screen.getByText("😆 たのしい")).toBeInTheDocument();
    });

    it("怖い → 😰 こわい と表示される", () => {
      render(<SearchBar emotions={[{ id: 4, name: "怖い" }]} />);
      expect(screen.getByText("😰 こわい")).toBeInTheDocument();
    });

    it("感動的 → 🥺 じーんとした と表示される", () => {
      render(<SearchBar emotions={[{ id: 6, name: "感動的" }]} />);
      expect(screen.getByText("🥺 じーんとした")).toBeInTheDocument();
    });

    it("全感情の生ラベルが表示されない", () => {
      render(<SearchBar emotions={mockEmotions} />);
      mockEmotions.forEach(({ name }) => {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      });
    });
  });

  describe("日付プリセット", () => {
    it("きょう・今週・今月 のプリセットボタンが表示される", () => {
      render(<SearchBar />);
      expect(screen.getByText("きょう")).toBeInTheDocument();
      expect(screen.getByText("今週")).toBeInTheDocument();
      expect(screen.getByText("今月")).toBeInTheDocument();
    });

    it("「きょう」ボタンを押すと開始日と終了日が同じ日付になる", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);
      await user.click(screen.getByText("きょう"));
      const startInput = screen.getByLabelText("いつから");
      const endInput = screen.getByLabelText("いつまで");
      expect(startInput.value).not.toBe("");
      expect(startInput.value).toBe(endInput.value);
    });
  });
});
