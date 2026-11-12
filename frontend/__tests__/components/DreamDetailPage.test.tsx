import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import DreamDetailPage from "@/app/dream/[id]/page";

jest.mock("react", () => {
  const actual = jest.requireActual("react") as Record<string, unknown>;
  return {
    ...actual,
    use: (value: unknown) => value,
  };
});

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
  isEmailVerificationRequiredError: () => false,
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    fill,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => <img alt={alt} {...props} />,
}));

jest.mock("@/app/components/DeleteButton", () => ({
  __esModule: true,
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      ごみばこ
    </button>
  ),
}));

jest.mock("@/app/components/DreamForm", () => ({
  __esModule: true,
  default: ({ onSubmit }: { onSubmit: (data: { title: string }) => void }) => (
    <div>
      DreamForm
      <button type="button" onClick={() => onSubmit({ title: "新しいタイトル" })}>
        フォームをほぞん
      </button>
    </div>
  ),
}));

jest.mock("@/app/components/StreamingAnalysis", () => ({
  __esModule: true,
  default: ({
    title,
    text,
    emotions = [],
  }: {
    title: string;
    text: string;
    emotions?: string[];
  }) => (
    <section>
      <p>{title}</p>
      <p>{text}</p>
      {emotions.map((emotion) => (
        <span key={emotion}>{emotion}</span>
      ))}
    </section>
  ),
}));

jest.mock("@/components/ui/alert-dialog", () => {
  const React = require("react");
  const passthrough =
    (Tag = "div") =>
    ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(Tag, props, children);

  return {
    AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <>{children}</> : null,
    AlertDialogContent: passthrough(),
    AlertDialogHeader: passthrough(),
    AlertDialogTitle: passthrough("h2"),
    AlertDialogDescription: passthrough("p"),
    AlertDialogFooter: passthrough(),
    AlertDialogCancel: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    AlertDialogAction: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  };
});

jest.mock("@/hooks/useDream", () => ({
  useDream: jest.fn(),
}));

type MockAuthStatus = "checking" | "authenticated" | "unauthenticated";
let mockAuthStatus: MockAuthStatus = "authenticated";
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { age_group: "child" },
    authStatus: mockAuthStatus,
    isLoggedIn: mockAuthStatus === "authenticated",
  }),
}));

const { useDream } = require("@/hooks/useDream");

beforeEach(() => {
  mockAuthStatus = "authenticated";
  mockPush.mockReset();
  mockApiGet.mockReset();
  mockApiPost.mockReset();
  // 画像の残り枚数（image_quota）は今回の検証対象外なので、応答を返さないままにする
  mockApiGet.mockImplementation(() => new Promise(() => {}));
});

describe("DreamDetailPage", () => {
  it("renders legacy analysis_json.text in read mode", () => {
    useDream.mockReturnValue({
      dream: {
        id: 1,
        title: "ふしぎな ゆめ",
        content: "くもの うえを あるいた",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [],
        analysis_json: {
          text: "むかしの けいしきの うらない",
          emotion_tags: [],
        },
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    render(<DreamDetailPage params={{ id: "1" } as never} />);

    expect(
      screen.getAllByText("🔮 モルペウスの ゆめうらない")[0]
    ).toBeTruthy();
    expect(
      screen.getByText("むかしの けいしきの うらない")
    ).toBeTruthy();
  });

  it("AI画像ありの夢で画像が二重表示されない", () => {
    const AI_IMAGE_URL =
      "https://oaidalleapiprodscus.blob.core.windows.net/private/img-dedup-test.png";

    useDream.mockReturnValue({
      dream: {
        id: 2,
        title: "二重表示テスト",
        content: "テスト本文",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [],
        analysis_json: { emotion_tags: [] },
        generated_image_url: AI_IMAGE_URL,
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    const { container } = render(<DreamDetailPage params={{ id: "2" } as never} />);

    const allImgs = Array.from(container.querySelectorAll("img"));
    const dreamImgs = allImgs.filter(
      (el) => el.getAttribute("src") === AI_IMAGE_URL
    );

    expect(dreamImgs).toHaveLength(1);

    const shareCard = screen.getByTestId("dream-share-card");
    expect(shareCard.contains(dreamImgs[0])).toBe(true);
  });

  it("画像がない夢でもシェアカードとフォールバックが表示される", () => {
    useDream.mockReturnValue({
      dream: {
        id: 3,
        title: "画像なしの夢",
        content: "本文テスト",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [],
        analysis_json: { emotion_tags: [] },
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    render(<DreamDetailPage params={{ id: "3" } as never} />);

    expect(screen.getByTestId("dream-share-card")).toBeTruthy();
    expect(screen.getByTestId("dream-share-card-fallback")).toBeTruthy();
  });

  it("dream.dream_profile の名前・絵文字がシェアカードに表示される", () => {
    useDream.mockReturnValue({
      dream: {
        id: 4,
        title: "プロフィール付きの夢",
        content: "本文テスト",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [],
        analysis_json: { emotion_tags: [] },
        dream_profile: {
          id: 10,
          name: "ねこさん",
          avatar_emoji: "🐱",
          color: "#f97316",
          active: true,
        },
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    render(<DreamDetailPage params={{ id: "4" } as never} />);

    const shareCard = screen.getByTestId("dream-share-card");
    const chip = within(shareCard).getByTestId("profile-chip");
    expect(chip.textContent).toContain("ねこさん");
    expect(chip.textContent).toContain("🐱");
  });

  it("画像の onError で既存エラー文が表示され、フォールバックへ切り替わる", () => {
    const AI_IMAGE_URL =
      "https://oaidalleapiprodscus.blob.core.windows.net/private/img-error-test.png";

    useDream.mockReturnValue({
      dream: {
        id: 5,
        title: "期限切れ画像の夢",
        content: "本文テスト",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [],
        analysis_json: { emotion_tags: [] },
        generated_image_url: AI_IMAGE_URL,
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    render(<DreamDetailPage params={{ id: "5" } as never} />);

    const shareCardBefore = screen.getByTestId("dream-share-card");
    const img = within(shareCardBefore).getByRole("img");
    fireEvent.error(img);

    expect(
      screen.getByText(
        "ほぞんずみ の ゆめのえ の きげん が きれました。もういちど かいてみてください。"
      )
    ).toBeTruthy();

    const shareCardAfter = screen.getByTestId("dream-share-card");
    expect(
      within(shareCardAfter).getByTestId("dream-share-card-fallback")
    ).toBeTruthy();
  });

  it("does not render dream content inside the share card", () => {
    useDream.mockReturnValue({
      dream: {
        id: 1,
        title: "星空を走る夢",
        content: "これは共有カードに出してはいけない夢本文です",
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        userId: 1,
        emotions: [{ id: 1, name: "楽しい" }],
        analysis_json: {
          analysis: "楽しい気持ちが強い夢です",
          emotion_tags: ["楽しい"],
        },
        generated_image_url: "data:image/png;base64,ZmFrZQ==",
      },
      error: null,
      isLoading: false,
      isUpdating: false,
      updateDream: jest.fn(),
      deleteDream: jest.fn(),
    });

    render(<DreamDetailPage params={{ id: "1" } as never} />);

    const shareCard = screen.getByTestId("dream-share-card");

    expect(within(shareCard).getByText("YumeTree")).toBeTruthy();
    expect(within(shareCard).getByText("ユメツリー")).toBeTruthy();
    expect(within(shareCard).getByText("星空を走る夢")).toBeTruthy();
    expect(
      within(shareCard).queryByText(
        "これは共有カードに出してはいけない夢本文です"
      )
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 夢IDが変わったとき、前の夢の編集・削除確認・画像の状態を持ち越さないことの検証
// （同じページインスタンスのまま params だけが変わるケースを rerender で再現する）
// ---------------------------------------------------------------------------

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function dreamOf(id: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `夢${id}のタイトル`,
    content: `夢${id}の本文`,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    userId: 1,
    emotions: [],
    analysis_json: { emotion_tags: [] },
    ...extra,
  };
}

function showDream(
  dream: ReturnType<typeof dreamOf>,
  hooks: { updateDream?: unknown; deleteDream?: unknown } = {}
) {
  useDream.mockReturnValue({
    dream,
    error: null,
    isLoading: false,
    isUpdating: false,
    updateDream: hooks.updateDream ?? jest.fn(),
    deleteDream: hooks.deleteDream ?? jest.fn(),
  });
}

const pageFor = (id: string) => <DreamDetailPage params={{ id } as never} />;

describe("DreamDetailPage: 夢IDが変わったときの状態の持ち越し", () => {
  describe("[High2] 削除確認", () => {
    it("夢1の削除確認を開いたまま夢2へ移動したら、確認は閉じ、DELETEは発行されない", () => {
      const deleteDream = jest.fn(async (_id: number) => true);
      showDream(dreamOf(1), { deleteDream });
      const { rerender } = render(pageFor("1"));

      fireEvent.click(screen.getByText("ごみばこ"));
      expect(screen.getByText("けしてしまう")).toBeTruthy();

      showDream(dreamOf(2), { deleteDream });
      rerender(pageFor("2"));

      // 古い確認ダイアログが残っていれば押してみる（残っていないのが正しい）
      const staleConfirm = screen.queryByText("けしてしまう");
      if (staleConfirm) fireEvent.click(staleConfirm);

      expect(staleConfirm).toBeNull();
      expect(deleteDream).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("夢1の削除中に夢2へ移動したら、DELETEが遅れて成功しても /home へ遷移しない", async () => {
      const pendingDelete = deferred<boolean>();
      const deleteDream = jest.fn((_id: number) => pendingDelete.promise);
      showDream(dreamOf(1), { deleteDream });
      const { rerender } = render(pageFor("1"));

      fireEvent.click(screen.getByText("ごみばこ"));
      fireEvent.click(screen.getByText("けしてしまう"));
      expect(deleteDream).toHaveBeenCalledWith(1);

      showDream(dreamOf(2), { deleteDream });
      rerender(pageFor("2"));

      await act(async () => {
        pendingDelete.resolve(true);
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { level: 1, name: "夢2のタイトル" })).toBeTruthy();
    });

    it("表示中の夢の削除を確定したら、その夢のIDで削除して /home へ遷移する（回帰）", async () => {
      const deleteDream = jest.fn(async (_id: number) => true);
      showDream(dreamOf(1), { deleteDream });
      render(pageFor("1"));

      fireEvent.click(screen.getByText("ごみばこ"));
      await act(async () => {
        fireEvent.click(screen.getByText("けしてしまう"));
      });

      expect(deleteDream).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith("/home");
    });
  });

  describe("[High1/Medium B] 編集状態", () => {
    it("夢1を編集中に夢2へ移動したら、夢2は閲覧モードで表示される", () => {
      showDream(dreamOf(1));
      const { rerender } = render(pageFor("1"));
      fireEvent.click(screen.getByText("✏️ なおす"));
      expect(screen.getByText("DreamForm")).toBeTruthy();

      showDream(dreamOf(2));
      rerender(pageFor("2"));

      expect(screen.queryByText("DreamForm")).toBeNull();
      expect(screen.getByRole("heading", { level: 1, name: "夢2のタイトル" })).toBeTruthy();
    });

    it("夢1→2→1と戻って新しく編集を始めたあと、最初の保存が成功しても新しい編集は終了しない", async () => {
      const firstSave = deferred<boolean>();
      const updateDream = jest.fn((_data: unknown) => firstSave.promise);
      showDream(dreamOf(1), { updateDream });
      const { rerender } = render(pageFor("1"));

      fireEvent.click(screen.getByText("✏️ なおす"));
      fireEvent.click(screen.getByText("フォームをほぞん"));
      expect(updateDream).toHaveBeenCalledTimes(1);

      showDream(dreamOf(2), { updateDream });
      rerender(pageFor("2"));
      showDream(dreamOf(1), { updateDream });
      rerender(pageFor("1"));

      // 戻った夢1で新しく編集を始める（編集モードが持ち越されていればそのまま）
      const editButton = screen.queryByText("✏️ なおす");
      if (editButton) fireEvent.click(editButton);
      expect(screen.getByText("DreamForm")).toBeTruthy();

      await act(async () => {
        firstSave.resolve(true);
      });

      expect(screen.getByText("DreamForm")).toBeTruthy();
    });
  });

  describe("[Medium B] 画像", () => {
    const IMAGE_1 = "https://example.com/dream-1.png";
    const NEW_IMAGE = "https://example.com/generated-for-dream-1.png";

    const imgsWithSrc = (container: HTMLElement, src: string) =>
      Array.from(container.querySelectorAll("img")).filter(
        (el) => el.getAttribute("src") === src
      );

    it("画像ありの夢1から画像なしの夢2へ移動したら、夢1の画像を表示しない", () => {
      showDream(dreamOf(1, { generated_image_url: IMAGE_1 }));
      const { container, rerender } = render(pageFor("1"));
      expect(imgsWithSrc(container, IMAGE_1)).toHaveLength(1);

      showDream(dreamOf(2));
      rerender(pageFor("2"));

      expect(imgsWithSrc(container, IMAGE_1)).toHaveLength(0);
      expect(screen.getByTestId("dream-share-card-fallback")).toBeTruthy();
    });

    it("夢1の画像生成中に夢2へ移動したら、生成中表示を持ち越さず、遅れて成功した画像も表示しない", async () => {
      const generation = deferred<{ image_url: string }>();
      mockApiPost.mockReturnValue(generation.promise);
      showDream(dreamOf(1));
      const { container, rerender } = render(pageFor("1"));

      fireEvent.click(screen.getByText(/ゆめのえを かく/));
      expect(mockApiPost).toHaveBeenCalledWith(
        "/dreams/1/generate_image",
        {},
        expect.anything()
      );
      expect(screen.getAllByText(/かいています/).length).toBeGreaterThan(0);

      showDream(dreamOf(2));
      rerender(pageFor("2"));
      expect(screen.queryByText(/かいています/)).toBeNull();

      await act(async () => {
        generation.resolve({ image_url: NEW_IMAGE });
      });

      expect(imgsWithSrc(container, NEW_IMAGE)).toHaveLength(0);
      expect(screen.getByTestId("dream-share-card-fallback")).toBeTruthy();
    });

    it("夢1の画像生成中に夢2へ移動したら、遅れて失敗したエラーを夢2に表示しない", async () => {
      const generation = deferred<{ image_url: string }>();
      mockApiPost.mockReturnValue(generation.promise);
      showDream(dreamOf(1));
      const { rerender } = render(pageFor("1"));

      fireEvent.click(screen.getByText(/ゆめのえを かく/));

      showDream(dreamOf(2));
      rerender(pageFor("2"));

      await act(async () => {
        generation.reject(new Error("夢1の画像生成に失敗"));
      });

      expect(screen.queryByText("夢1の画像生成に失敗")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 夢IDは同じまま認証状態だけが変わったとき、古い画像生成・削除の完了を
// 現在のページ状態へ反映しないことの検証
// ---------------------------------------------------------------------------

describe("DreamDetailPage: 同じ夢IDで認証状態が変わったときの古い処理", () => {
  const OLD_IMAGE = "https://example.com/generated-before-auth-change.png";
  const NEW_IMAGE = "https://example.com/generated-after-auth-change.png";

  const imgsWithSrc = (container: HTMLElement, src: string) =>
    Array.from(container.querySelectorAll("img")).filter(
      (el) => el.getAttribute("src") === src
    );

  function changeAuth(
    rerender: (ui: React.ReactElement) => void,
    status: MockAuthStatus
  ) {
    mockAuthStatus = status;
    rerender(pageFor("1"));
  }

  function startImageGeneration() {
    const generation = deferred<{ image_url: string }>();
    mockApiPost.mockReturnValueOnce(generation.promise);
    showDream(dreamOf(1));
    const utils = render(pageFor("1"));
    fireEvent.click(screen.getByText(/ゆめのえを かく/));
    expect(screen.getAllByText(/かいています/).length).toBeGreaterThan(0);
    return { ...utils, generation };
  }

  it("画像生成中に認証確認中へ変わり、古いPOSTが成功しても画像を表示しない", async () => {
    const { container, rerender, generation } = startImageGeneration();

    changeAuth(rerender, "checking");
    await act(async () => {
      generation.resolve({ image_url: OLD_IMAGE });
    });
    changeAuth(rerender, "authenticated");

    expect(imgsWithSrc(container, OLD_IMAGE)).toHaveLength(0);
    expect(screen.queryByText(/かいています/)).toBeNull();
    expect(screen.getByTestId("dream-share-card-fallback")).toBeTruthy();
  });

  it("画像生成中に認証確認中へ変わり、古いPOSTが失敗してもエラーを表示しない", async () => {
    const { rerender, generation } = startImageGeneration();

    changeAuth(rerender, "checking");
    await act(async () => {
      generation.reject(new Error("認証変更前の画像生成に失敗"));
    });
    changeAuth(rerender, "authenticated");

    expect(screen.queryByText("認証変更前の画像生成に失敗")).toBeNull();
    expect(screen.queryByText(/かいています/)).toBeNull();
  });

  it("画像生成中にログアウト→再認証し、そのあと古いPOSTが完了しても反映しない", async () => {
    const { container, rerender, generation } = startImageGeneration();

    changeAuth(rerender, "unauthenticated");
    changeAuth(rerender, "authenticated");
    // 再認証後の画面は生成中を引き継がない
    expect(screen.queryByText(/かいています/)).toBeNull();

    await act(async () => {
      generation.resolve({ image_url: OLD_IMAGE });
    });

    expect(imgsWithSrc(container, OLD_IMAGE)).toHaveLength(0);
    expect(screen.queryByText(/かいています/)).toBeNull();
  });

  it("削除中に認証状態が変わったら、古いDELETEが成功しても /home へ遷移せず削除中も表示しない", async () => {
    const pendingDelete = deferred<boolean>();
    const deleteDream = jest.fn((_id: number) => pendingDelete.promise);
    showDream(dreamOf(1), { deleteDream });
    const { rerender } = render(pageFor("1"));

    fireEvent.click(screen.getByText("ごみばこ"));
    fireEvent.click(screen.getByText("けしてしまう"));
    expect(deleteDream).toHaveBeenCalledWith(1);

    changeAuth(rerender, "checking");
    changeAuth(rerender, "authenticated");
    await act(async () => {
      pendingDelete.resolve(true);
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByText("けしています...")).toBeNull();
    expect(screen.queryByText("けしてしまう")).toBeNull();
  });

  it("認証状態が変わったら、編集中の状態を引き継がない", () => {
    showDream(dreamOf(1));
    const { rerender } = render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));
    expect(screen.getByText("DreamForm")).toBeTruthy();

    changeAuth(rerender, "checking");
    changeAuth(rerender, "authenticated");

    expect(screen.queryByText("DreamForm")).toBeNull();
  });

  it("認証状態が変わったあとでも、通常の画像生成と削除はできる（回帰）", async () => {
    const deleteDream = jest.fn(async (_id: number) => true);
    showDream(dreamOf(1), { deleteDream });
    const { container, rerender } = render(pageFor("1"));

    changeAuth(rerender, "checking");
    changeAuth(rerender, "authenticated");

    mockApiPost.mockReturnValueOnce(Promise.resolve({ image_url: NEW_IMAGE }));
    await act(async () => {
      fireEvent.click(screen.getByText(/ゆめのえを かく/));
    });
    expect(imgsWithSrc(container, NEW_IMAGE)).toHaveLength(1);

    fireEvent.click(screen.getByText("ごみばこ"));
    await act(async () => {
      fireEvent.click(screen.getByText("けしてしまう"));
    });
    expect(deleteDream).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith("/home");
  });
});

describe("DreamDetailPage: 編集中の保存の失敗（Issue #561）", () => {
  const CONFLICT_TEXT = /べつの がめんや たんまつで、さきに ほぞんされているよ/;
  const RELOAD_BUTTON = "さいしんの ないようを よみこむ（いまの にゅうりょくは きえるよ）";

  function showEditingDream(state: {
    editConflict?: boolean;
    error?: string | null;
    updateDream?: unknown;
    reloadDream?: unknown;
  }) {
    useDream.mockReturnValue({
      dream: dreamOf(1),
      error: state.error ?? null,
      isLoading: false,
      isUpdating: false,
      editConflict: state.editConflict ?? false,
      updateDream: state.updateDream ?? jest.fn(async () => false),
      deleteDream: jest.fn(),
      reloadDream: state.reloadDream ?? jest.fn(async () => {}),
    });
  }

  it("409で保存できなかったら、編集フォーム（入力）を残したまま競合を知らせる", async () => {
    const updateDream = jest.fn(async (_data: unknown) => false);
    showEditingDream({ updateDream });
    const { rerender } = render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));

    await act(async () => {
      fireEvent.click(screen.getByText("フォームをほぞん"));
    });
    // フックが競合を知らせた状態で再描画される
    showEditingDream({ updateDream, editConflict: true });
    rerender(pageFor("1"));

    expect(screen.getByText("DreamForm")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(CONFLICT_TEXT);
    expect(screen.getByRole("button", { name: RELOAD_BUTTON })).toBeTruthy();
  });

  it("「さいしんの ないようを よみこむ」を押したときだけ最新を読み込む（自動で読み込まない）", async () => {
    const reloadDream = jest.fn(async () => {});
    showEditingDream({ editConflict: true, reloadDream });
    render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));
    expect(reloadDream).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: RELOAD_BUTTON }));
    });

    expect(reloadDream).toHaveBeenCalledTimes(1);
  });

  it("競合のあとで「やめる」を押したら、古い内容のまま閲覧に戻らないよう最新を読み込む", async () => {
    const reloadDream = jest.fn(async () => {});
    showEditingDream({ editConflict: true, reloadDream });
    render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));

    await act(async () => {
      fireEvent.click(screen.getByText("やめる"));
    });

    expect(screen.queryByText("DreamForm")).toBeNull();
    expect(reloadDream).toHaveBeenCalledTimes(1);
  });

  it("競合がなければ「やめる」で再読み込みしない（回帰）", async () => {
    const reloadDream = jest.fn(async () => {});
    showEditingDream({ reloadDream });
    render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));

    await act(async () => {
      fireEvent.click(screen.getByText("やめる"));
    });

    expect(reloadDream).not.toHaveBeenCalled();
  });

  it("競合以外の保存エラー（422など）も、編集フォームを残したまま表示する", () => {
    const message = "版番号（expected_edit_version）は0以上の整数で指定してください。";
    showEditingDream({ error: message });
    render(pageFor("1"));
    fireEvent.click(screen.getByText("✏️ なおす"));

    expect(screen.getByText("DreamForm")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(message);
    expect(screen.queryByRole("button", { name: RELOAD_BUTTON })).toBeNull();
  });
});

describe("DreamDetailPage: 保存の二重送信（呼び出し元の挙動）", () => {
  it("保存中にもう一度保存しても（フックが2件目を false で断る）、1件目の成功で編集を終える", async () => {
    const firstSave = deferred<boolean>();
    const updateDream = jest
      .fn((_data: unknown) => Promise.resolve(false))
      .mockImplementationOnce(() => firstSave.promise);
    showDream(dreamOf(1), { updateDream });
    render(pageFor("1"));

    fireEvent.click(screen.getByText("✏️ なおす"));
    fireEvent.click(screen.getByText("フォームをほぞん"));
    await act(async () => {
      fireEvent.click(screen.getByText("フォームをほぞん"));
    });

    // 2件目が断られても編集内容（フォーム）は残る
    expect(updateDream).toHaveBeenCalledTimes(2);
    expect(screen.getByText("DreamForm")).toBeTruthy();

    await act(async () => {
      firstSave.resolve(true);
    });
    expect(screen.queryByText("DreamForm")).toBeNull();
  });
});
