import React from "react";
import { render, screen, within } from "@testing-library/react";
import DreamDetailPage from "@/app/dream/[id]/page";

jest.mock("react", () => {
  const actual = jest.requireActual("react") as Record<string, unknown>;
  return {
    ...actual,
    use: (value: unknown) => value,
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
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
  default: () => <div>DreamForm</div>,
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
    AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { age_group: "child" },
    authStatus: "authenticated",
  }),
}));

const { useDream } = require("@/hooks/useDream");

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
