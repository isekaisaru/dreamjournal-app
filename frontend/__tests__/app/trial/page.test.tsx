import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TrialPage from "@/app/trial/page";
import { useAuth } from "@/context/AuthContext";
import apiClient, {
  createDream,
  previewAnalysis,
  updateDream,
  verifyAuth,
  ApiError,
} from "@/lib/apiClient";
import type { Dream } from "@/app/types";

// 体験版で書いた夢がDBに保存されず、再読み込みや本登録で消えていた問題
// （2026-07-22・2026-08-02のTrial P3 QAを2回無効化した実データ損失バグ）の回帰テスト。
// 「記録した夢」と画面に出る以上、実際にDBへ保存されていなければならない。
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => {
  class MockApiError extends Error {
    status = 0;
  }
  return {
    __esModule: true,
    default: { post: jest.fn(), get: jest.fn() },
    ApiError: MockApiError,
    createDream: jest.fn(),
    previewAnalysis: jest.fn(),
    updateDream: jest.fn(),
    verifyAuth: jest.fn(),
  };
});

jest.mock("@/app/components/MorpheusSmall", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-small" />,
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedCreateDream = createDream as jest.MockedFunction<typeof createDream>;
const mockedUpdateDream = updateDream as jest.MockedFunction<typeof updateDream>;
const mockedPreviewAnalysis = previewAnalysis as jest.MockedFunction<
  typeof previewAnalysis
>;
const mockedVerifyAuth = verifyAuth as jest.MockedFunction<typeof verifyAuth>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

type AuthValue = ReturnType<typeof useAuth>;

const makeAuth = (over: Partial<AuthValue> = {}): AuthValue =>
  ({
    authStatus: "authenticated",
    isLoggedIn: true,
    user: { id: "1", trial_user: true },
    userId: "1",
    login: jest.fn(),
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
    ...over,
  }) as AuthValue;

const makeExistingDream = (i: number, overrides: Partial<Dream> = {}): Dream =>
  ({
    id: i,
    title: `過去の夢${i}`,
    content: `過去の夢の内容${i}`,
    userId: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }) as Dream;

const writeDream = (text: string) => {
  fireEvent.change(
    screen.getByPlaceholderText("今朝見た夢を書いてみてください..."),
    { target: { value: text } }
  );
};

// 既存の夢の読み込み（マウント時の1回だけの取得）が完了するのを待つ。
// 読み込み中は「記録だけする」「AIにきいてみる」が無効化されているため、
// クリック系の操作を行う既存テストは、まずこの完了を待つ必要がある。
const waitForExistingDreamsLoaded = () =>
  waitFor(() => {
    expect(
      screen.queryByText("記録した夢を確認しています…")
    ).not.toBeInTheDocument();
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue(makeAuth());
  mockedGet.mockResolvedValue([] as Awaited<ReturnType<typeof apiClient.get>>);
  mockedCreateDream.mockResolvedValue({ id: 1 } as Awaited<
    ReturnType<typeof createDream>
  >);
  mockedUpdateDream.mockResolvedValue({ id: 1 } as Awaited<
    ReturnType<typeof updateDream>
  >);
  mockedPreviewAnalysis.mockResolvedValue({
    analysis: "やさしい ゆめ だね",
    emotion_tags: ["うれしい"],
  });
});

describe("TrialPage: 体験版の夢をDBへ保存する", () => {
  it("「記録だけする」でDBへ保存する（stateだけに積まない）", async () => {
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("青い扉の夢");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ content: "青い扉の夢" })
      );
    });
  });

  it("「AIにきいてみる」は先に保存してから分析し、結果を紐づける", async () => {
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("空を飛ぶ夢");

    fireEvent.click(screen.getByRole("button", { name: /AIにきいてみる/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ content: "空を飛ぶ夢" })
      );
    });
    await waitFor(() => {
      expect(mockedUpdateDream).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          analysis_json: {
            analysis: "やさしい ゆめ だね",
            emotion_tags: ["うれしい"],
          },
          analysis_status: "done",
        })
      );
    });
  });

  // AI分析は体験版で3回しか使えないため、保存できないのに回数だけ
  // 消費してしまう順序にはしない（Codexレビュー指摘）。
  it("保存に失敗したらAI分析を実行しない（貴重な回数を無駄にしない）", async () => {
    mockedCreateDream.mockRejectedValue(new Error("boom"));
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("ほぞんに しっぱいする ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /AIにきいてみる/ }));

    await waitFor(() => expect(mockedCreateDream).toHaveBeenCalled());
    expect(mockedPreviewAnalysis).not.toHaveBeenCalled();
  });

  it("分析だけ失敗しても、保存済みの夢は一覧に残る", async () => {
    mockedPreviewAnalysis.mockRejectedValue(new Error("analysis down"));
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("ぶんせきが こける ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /AIにきいてみる/ }));

    expect(
      await screen.findByText(
        "ぶんせきは できなかったけど、ゆめは のこして あるよ。"
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/記録した夢 \(1\/7\)/)).toBeInTheDocument();
  });

  // ensureTrialSession の失敗を握りつぶすと、未処理のPromise拒否になり
  // 画面に何も出ないまま終わる（Codexレビュー指摘）。
  it("トライアルログインに失敗してもエラーを表示する", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ authStatus: "unauthenticated", isLoggedIn: false, user: null })
    );
    mockedVerifyAuth.mockResolvedValue(null);
    mockedPost.mockRejectedValue(new Error("network down"));

    render(<TrialPage />);
    writeDream("ログインに しっぱいする ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /AIにきいてみる/ }));

    expect(
      await screen.findByText(
        "いま うまく つながらなかったよ。もういちど ためしてね。"
      )
    ).toBeInTheDocument();
  });

  it("タイトル未入力なら既定の名前で保存する", async () => {
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("なまえのない夢");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ title: "ゆめ 1" })
      );
    });
  });

  it("保存に失敗したら一覧へ足さず、エラーを表示する（画面が嘘をつかない）", async () => {
    mockedCreateDream.mockRejectedValue(new Error("boom"));
    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("ほぞんに しっぱいする ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    expect(
      await screen.findByText("ゆめを のこせなかったよ。もういちど ためしてね。")
    ).toBeInTheDocument();
    // 保存できていないのに「記録した夢」へ増やさない
    expect(screen.getByText(/記録した夢 \(0\/7\)/)).toBeInTheDocument();
  });

  it("未認証ならトライアルアカウントを作ってから保存する", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ authStatus: "unauthenticated", isLoggedIn: false, user: null })
    );
    mockedVerifyAuth.mockResolvedValue(null);
    mockedPost.mockResolvedValue({ user: { id: 9 } } as never);

    render(<TrialPage />);
    writeDream("みとうろくの ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        "/auth/trial_login",
        expect.anything()
      );
    });
    await waitFor(() => expect(mockedCreateDream).toHaveBeenCalled());
  });
});

// リロード後に「記録した夢 (0/7)」へ戻ってしまう表示不整合の回帰テスト。
// Rails側は current_user.dreams.count（DB累計）で7件上限を強制しているため、
// 既存の夢を取り込んで dreams state をDBの実態に合わせる。
describe("TrialPage: 既存の夢をDBから読み込んで件数表示に反映する", () => {
  it("既存5件を取得すると5/7になり、一覧にも既存5件が表示される", async () => {
    mockedGet.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => makeExistingDream(i + 1))
    );

    render(<TrialPage />);

    expect(
      await screen.findByText(/記録した夢 \(5\/7\)/)
    ).toBeInTheDocument();
    expect(screen.getByText("過去の夢1")).toBeInTheDocument();
    expect(screen.getByText("過去の夢5")).toBeInTheDocument();
  });

  it("既存7件なら上限表示になり、両ボタンとも追加できない", async () => {
    mockedGet.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => makeExistingDream(i + 1))
    );

    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("8こめの ゆめ");

    expect(
      screen.getByText(/記録した夢 \(7\/7\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /記録だけする/ })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /AIにきいてみる/ })
    ).toBeDisabled();
  });

  it("未認証状態では既存dreamの取得を行わない", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ authStatus: "unauthenticated", isLoggedIn: false, user: null })
    );

    render(<TrialPage />);

    // 未認証では読み込み中表示も出さず、即座に通常の空表示になる
    expect(
      await screen.findByText(/記録した夢 \(0\/7\)/)
    ).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("本登録ユーザー（trial_userでない）が開いた場合も既存dreamの取得を行わない", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "1", trial_user: false } })
    );

    render(<TrialPage />);

    expect(
      await screen.findByText(/記録した夢 \(0\/7\)/)
    ).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("既存dreamの取得に失敗してもページはクラッシュせず、通常どおり操作できる", async () => {
    mockedGet.mockRejectedValue(new Error("network down"));

    render(<TrialPage />);
    await waitForExistingDreamsLoaded();

    // 取得失敗時は0件のまま操作を継続できる（バックエンドの累計7件強制が最後の砦）
    expect(screen.getByText(/記録した夢 \(0\/7\)/)).toBeInTheDocument();
    writeDream("しっぱいしても だいじょうぶな ゆめ");
    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(mockedCreateDream).toHaveBeenCalledWith(
        expect.objectContaining({ content: "しっぱいしても だいじょうぶな ゆめ" })
      );
    });
  });

  it("初回取得後に1件保存すると、既存件数に正しく1件加わる（二重カウントしない）", async () => {
    mockedGet.mockResolvedValue(
      Array.from({ length: 2 }, (_, i) => makeExistingDream(i + 1))
    );

    render(<TrialPage />);
    expect(
      await screen.findByText(/記録した夢 \(2\/7\)/)
    ).toBeInTheDocument();

    writeDream("3こめの ゆめ");
    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    await waitFor(() => {
      expect(screen.getByText(/記録した夢 \(3\/7\)/)).toBeInTheDocument();
    });
    // 初回取得した2件がそのまま残っている（消えていない）
    expect(screen.getByText("過去の夢1")).toBeInTheDocument();
    expect(screen.getByText("過去の夢2")).toBeInTheDocument();
  });

  // バックエンドが累計7件を超えた保存を403 + limit_reached=true で拒否した場合も、
  // 既存のエラー表示経路（saveErrorMessage）がそのまま機能することを確認する。
  it("バックエンドが403（limit_reached）を返しても、既存の日本語エラー表示経路で表示される", async () => {
    const limitError = new ApiError(
      "お試しで のこせる ゆめは 7こ までだよ。アカウント登録すると、ずっと のこせるよ。"
    );
    limitError.status = 403;
    mockedCreateDream.mockRejectedValue(limitError);

    render(<TrialPage />);
    await waitForExistingDreamsLoaded();
    writeDream("うえげんを こえた ゆめ");

    fireEvent.click(screen.getByRole("button", { name: /記録だけする/ }));

    expect(
      await screen.findByText(
        "お試しで のこせる ゆめは 7こ までだよ。アカウント登録すると、ずっと のこせるよ。"
      )
    ).toBeInTheDocument();
  });

  // premium: true の trial 由来ユーザーは、DreamsController#check_trial_dream_limit が
  // 明示的に7件上限から除外している。フロントの既存件数取得・上限表示もこのユーザーには
  // 適用しない（課金済みなのに/trialだけ書けなくなるのを防ぐ、Codexレビュー指摘）。
  it("premium: trueのtrialユーザーは既存dreamを取得せず、上限表示も出さない", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({ user: { id: "1", trial_user: true, premium: true } })
    );

    render(<TrialPage />);

    expect(
      await screen.findByText(/記録した夢 \(0\/7\)/)
    ).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  // React/Next の開発時Strict Modeはマウント時にeffectを
  // setup→cleanup→setupと二重実行する。一度きりのref判定だけで実装すると、
  // 最初のsetupの取得がcleanupでキャンセルされた後、2回目のsetupがrefにより
  // 素通りしてしまい、読み込み中表示のまま固まる（Codexレビュー指摘）。
  it("Strict Modeでeffectが二重実行されても、読み込みが完了しボタンが使えるようになる", async () => {
    mockedGet.mockResolvedValue([]);

    render(
      <React.StrictMode>
        <TrialPage />
      </React.StrictMode>
    );

    // 読み込み中表示のまま固まらないことを確認（Strict Modeの二重実行分だけ
    // apiClient.get が2回呼ばれること自体は開発時のみの無害な副作用として許容する）。
    await waitForExistingDreamsLoaded();
    writeDream("Strict Modeでも かける ゆめ");
    expect(
      screen.getByRole("button", { name: /記録だけする/ })
    ).not.toBeDisabled();
  });
});
