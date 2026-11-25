import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DreamForm from "@/app/components/DreamForm";
import { getDreamProfiles, getEmotions, previewAnalysis } from "@/lib/apiClient";

// 「モルペウスに きく」の結果は、保存前のおためし。
// 結果を読んで記録できたと思い、画面を離れると、夢も分析も消えてしまう（2026-11-25）。
jest.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get: (_, tag) =>
        React.forwardRef(({ children, ...props }: any, ref: any) => {
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
  return { motion, AnimatePresence: ({ children }: any) => children };
});

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => ({ user: { id: "1", email: "dreamer@example.com" } }),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  getEmotions: jest.fn(),
  getDreamProfiles: jest.fn(),
  previewAnalysis: jest.fn(),
  resendVerificationEmail: jest.fn(),
  isEmailVerificationRequiredError: () => false,
  ApiError: class ApiError extends Error {},
}));

jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockedGetProfiles = getDreamProfiles as jest.Mock;
const mockedGetEmotions = getEmotions as jest.Mock;
const mockedPreviewAnalysis = previewAnalysis as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  mockedGetEmotions.mockResolvedValue([]);
  mockedGetProfiles.mockResolvedValue([]);
  mockedPreviewAnalysis.mockResolvedValue({
    analysis: "そらを とぶ ゆめは、あたらしい ことに ちょうせん したい きもちだよ",
    emotion_tags: [],
  });
});

describe("DreamForm: 分析を見たあとの保存の案内", () => {
  it("分析する前は、保存の案内を出さない", async () => {
    render(<DreamForm onSubmit={jest.fn()} />);

    expect(
      await screen.findByRole("button", { name: "ゆめを のこす" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/まだ のこして いないよ/)).not.toBeInTheDocument();
  });

  it("分析の結果を見せたら、まだ保存していないことと、押すボタンを伝える", async () => {
    const user = userEvent.setup();
    render(<DreamForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText("どんな おはなし？"), "そらを とんだ");
    await user.click(screen.getByRole("button", { name: /モルペウスに きく/ }));

    expect(
      await screen.findByText(/そらを とぶ ゆめは/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/この おへんじは まだ のこして いないよ。さいごに「ゆめを のこす」を おすと/)
    ).toBeInTheDocument();
  });
});
