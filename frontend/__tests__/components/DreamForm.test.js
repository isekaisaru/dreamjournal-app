import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DreamForm from "@/app/components/DreamForm";
import { createMockEmotion } from "../utils/mockFactory";

// framer-motion uses ESM and breaks Jest — proxy motion.* to plain HTML elements
jest.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get: (_, tag) =>
        // eslint-disable-next-line react/display-name
        React.forwardRef(({ children, ...props }, ref) => {
          // Strip framer-specific props so React doesn't warn about unknown attrs
          const {
            initial, animate, exit, transition, variants, whileHover, whileTap,
            whileFocus, whileDrag, whileInView, drag, dragConstraints,
            layoutId, layout, onAnimationStart, onAnimationComplete,
            viewport, custom, style, ...rest
          } = props;
          return React.createElement(tag, { ...rest, ref, style }, children);
        }),
    }
  );
  return { motion, AnimatePresence: ({ children }) => children };
});

// Mocks
jest.mock("@/lib/apiClient", () => ({
  getEmotions: jest.fn(),
  previewAnalysis: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const { getEmotions, previewAnalysis } = require("@/lib/apiClient");
const { toast } = require("@/lib/toast");

describe("DreamForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads emotions and toggles selection", async () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 1, name: "嬉しい" }),
      createMockEmotion({ id: 2, name: "悲しい" }),
    ];
    getEmotions.mockResolvedValueOnce(emotions);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    // Act
    render(<DreamForm onSubmit={onSubmit} />);

    // Assert
    const happy = await screen.findByRole("checkbox", { name: "😊 うれしい" });
    const sad = await screen.findByRole("checkbox", { name: "😢 かなしい" });
    expect(happy).toBeInTheDocument();
    expect(sad).toBeInTheDocument();

    // toggle select/unselect
    expect(happy).not.toBeChecked();
    await user.click(screen.getByText("😊 うれしい"));
    expect(happy).toBeChecked();
    await user.click(screen.getByText("😊 うれしい"));
    expect(happy).not.toBeChecked();
  });

  it("submits valid form with trimmed fields and selected emotion_ids", async () => {
    // Arrange
    const emotions = [createMockEmotion({ id: 5, name: "楽しい" })];
    getEmotions.mockResolvedValueOnce(emotions);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<DreamForm onSubmit={onSubmit} />);

    // Wait for emotions
    const fun = await screen.findByRole("checkbox", { name: "😆 たのしい" });

    // The previous error in DreamCard showed "😊 うれしい". This suggests sticking to the emoji versions.

    // Let's update the selector to "ゆめの なまえ" and "どんな おはなし？".
    const titleInput = screen.getByLabelText("ゆめの なまえ");
    const contentInput = screen.getByLabelText("どんな おはなし？");
    await user.type(titleInput, "  テストタイトル  ");
    await user.type(contentInput, "  テスト内容  ");
    await user.click(screen.getByText("😆 たのしい"));
    await waitFor(() => {
      expect(fun).toBeChecked();
    });

    // Act
    await user.click(screen.getByRole("button", { name: "ゆめを のこす" }));

    // Assert
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "テストタイトル",
        content: "テスト内容",
        emotion_ids: [5],
      })
    );
  });

  it("shows validation error when title is only whitespace and does not submit", async () => {
    // Arrange
    getEmotions.mockResolvedValueOnce([]);
    const onSubmit = jest.fn();
    const user = userEvent.setup();

    render(<DreamForm onSubmit={onSubmit} />);

    // Fill title with spaces to bypass HTML required check but fail trim validation
    // Fill title with spaces to bypass HTML required check but fail trim validation
    const titleInput = screen.getByLabelText("ゆめの なまえ");
    await user.type(titleInput, "   ");
    await user.click(screen.getByRole("button", { name: "ゆめを のこす" }));

    // Assert
    // Assert
    expect(toast.error).toHaveBeenCalledWith("ゆめの なまえ を かいてね");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("handles emotion fetch errors and shows fallback message", async () => {
    // Arrange
    getEmotions.mockRejectedValueOnce(new Error("network error"));
    const onSubmit = jest.fn();

    // Act
    render(<DreamForm onSubmit={onSubmit} />);

    // Assert
    // After failure, no emotions -> fallback text is shown
    expect(
      await screen.findByText("感情タグがありません。")
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("感情一覧の取得に失敗しました。");
  });

  it("pre-fills fields and selected emotions from initialData", async () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 10, name: "不安" }),
      createMockEmotion({ id: 11, name: "不思議" }),
    ];
    getEmotions.mockResolvedValueOnce(emotions);

    const initialData = {
      id: 1,
      title: "初期タイトル",
      content: "初期コンテンツ",
      userId: 1,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
      emotions: [{ id: 11, name: "不思議" }],
    };

    // Act
    render(<DreamForm initialData={initialData} onSubmit={jest.fn()} />);

    // Assert
    expect(screen.getByDisplayValue("初期タイトル")).toBeInTheDocument();
    expect(screen.getByDisplayValue("初期コンテンツ")).toBeInTheDocument();

    const wonder = await screen.findByRole("checkbox", {
      name: "😵 わからない",
    });
    const anxiety = await screen.findByRole("checkbox", {
      name: "😓 しんぱい",
    });
    expect(wonder).toBeChecked();
    expect(anxiety).not.toBeChecked();
  });

  it("updates analysis text and emotion selection immediately after re-analysis in edit mode", async () => {
    const emotions = [
      createMockEmotion({ id: 10, name: "不安" }),
      createMockEmotion({ id: 11, name: "不思議" }),
      createMockEmotion({ id: 12, name: "嬉しい" }),
    ];
    getEmotions.mockResolvedValueOnce(emotions);
    previewAnalysis.mockResolvedValueOnce({
      analysis: "あたらしい うらない けっか",
      emotion_tags: ["不安", "嬉しい"],
    });

    const initialData = {
      id: 1,
      title: "初期タイトル",
      content: "初期コンテンツ",
      userId: 1,
      created_at: "2025-01-01",
      updated_at: "2025-01-01",
      emotions: [{ id: 11, name: "不思議" }],
      analysis_json: {
        analysis: "まえの うらない",
        emotion_tags: ["不思議"],
      },
    };

    const user = userEvent.setup();

    render(<DreamForm initialData={initialData} onSubmit={jest.fn()} />);

    const analyzeButton = await screen.findByRole("button", {
      name: /もういちど\s*きく/,
    });
    const wonder = await screen.findByRole("checkbox", {
      name: "😵 わからない",
    });
    const anxiety = await screen.findByRole("checkbox", {
      name: "😓 しんぱい",
    });
    const happy = await screen.findByRole("checkbox", {
      name: "😊 うれしい",
    });

    expect(screen.getByText("まえの うらない")).toBeInTheDocument();
    expect(wonder).toBeChecked();
    expect(anxiety).not.toBeChecked();
    expect(happy).not.toBeChecked();

    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(previewAnalysis).toHaveBeenCalledWith("初期コンテンツ");
    });

    await waitFor(() => {
      expect(screen.getByText("あたらしい うらない けっか")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(anxiety).toBeChecked();
      expect(happy).toBeChecked();
    });
    expect(wonder).not.toBeChecked();
    expect(screen.getByText("#不安")).toBeInTheDocument();
    expect(screen.getByText("#嬉しい")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("モルペウスが おへんじ したよ！");
  });
});
