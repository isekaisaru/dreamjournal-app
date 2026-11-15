import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DreamForm from "@/app/components/DreamForm";
import { getDreamProfiles, getEmotions } from "@/lib/apiClient";

// 「誰の夢として保存するか」を取り違えるとデータの質が壊れる。
// 選択状態が色だけで示され、読み上げにも伝わっていなかった問題の回帰テスト。
jest.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get: (_, tag) =>
        // eslint-disable-next-line react/display-name
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
  useAuth: () => ({ user: { id: "1", email: "teruo@example.com" } }),
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

const profile = (id: number, name: string) => ({
  id,
  name,
  avatar_emoji: "😴",
  color: "#6366f1",
  relationship: id === 1 ? "self" : "child",
  active: true,
  position: id,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetEmotions.mockResolvedValue([]);
});

describe("DreamForm: 誰の夢として保存するか", () => {
  it("選択中のプロフィールが読み上げにも伝わる（aria-pressed）", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分"), profile(2, "テル")]);

    render(<DreamForm onSubmit={jest.fn()} />);

    // 「自分」は保存ボタン（自分の ゆめを のこす）にも含まれるため、
    // 選択グループの中に絞ってから探す。
    const group = await screen.findByRole("group", { name: "誰の夢？" });
    const self = within(group).getByRole("button", { name: /自分/ });
    const teru = within(group).getByRole("button", { name: /テル/ });

    // 新規作成時は self が既定で選ばれる
    expect(self).toHaveAttribute("aria-pressed", "true");
    expect(teru).toHaveAttribute("aria-pressed", "false");
  });

  it("切り替えると aria-pressed も入れ替わる", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分"), profile(2, "テル")]);
    const user = userEvent.setup();

    render(<DreamForm onSubmit={jest.fn()} />);

    const group = await screen.findByRole("group", { name: "誰の夢？" });
    const teru = within(group).getByRole("button", { name: /テル/ });
    await user.click(teru);

    await waitFor(() => expect(teru).toHaveAttribute("aria-pressed", "true"));
    expect(
      within(group).getByRole("button", { name: /自分/ })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("保存ボタンに、誰の夢として残すかを出す", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分"), profile(2, "テル")]);
    const user = userEvent.setup();

    render(<DreamForm onSubmit={jest.fn()} />);

    expect(
      await screen.findByRole("button", { name: "自分の ゆめを のこす" })
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: "誰の夢？" });
    await user.click(within(group).getByRole("button", { name: /テル/ }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "テルの ゆめを のこす" })
      ).toBeInTheDocument()
    );
  });

  it("プロフィールが1つだけなら、わざわざ名乗らない", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分")]);

    render(<DreamForm onSubmit={jest.fn()} />);

    expect(
      await screen.findByRole("button", { name: "ゆめを のこす" })
    ).toBeInTheDocument();
    // 選択UI自体も出さない
    expect(screen.queryByRole("group", { name: "誰の夢？" })).not.toBeInTheDocument();
  });

  // アーカイブ済みプロフィールは選択肢から外れるため、編集時に持ち主が
  // 引けなくなる。保存時は selectedProfileId をそのまま送るので、
  // 「持ち主が選択肢に無いとき」こそ名前を出す必要がある（Codexレビュー指摘）。
  it("アーカイブ済みプロフィールの夢を編集するときも、持ち主の名前を出す", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分")]);

    render(
      <DreamForm
        onSubmit={jest.fn()}
        initialData={
          {
            id: 10,
            title: "むかしの ゆめ",
            content: "ないよう",
            dream_profile_id: 99,
            dream_profile: {
              id: 99,
              name: "そつぎょうした テル",
              avatar_emoji: "😴",
              color: "#6366f1",
              active: false,
            },
          } as never
        }
      />
    );

    expect(
      await screen.findByRole("button", {
        name: "そつぎょうした テルの ゆめを のこす",
      })
    ).toBeInTheDocument();
  });

  it("選択グループに名前がついている", async () => {
    mockedGetProfiles.mockResolvedValue([profile(1, "自分"), profile(2, "テル")]);

    render(<DreamForm onSubmit={jest.fn()} />);

    expect(
      await screen.findByRole("group", { name: "誰の夢？" })
    ).toBeInTheDocument();
  });
});
