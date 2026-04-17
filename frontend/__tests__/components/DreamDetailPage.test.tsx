import React from "react";
import { render, screen } from "@testing-library/react";
import DreamDetailPage from "@/app/dream/[id]/page";

jest.mock("react", () => {
  const actual = jest.requireActual("react");
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
      screen.getByText("🔮 モルペウスの ゆめうらない")
    ).toBeInTheDocument();
    expect(
      screen.getByText("むかしの けいしきの うらない")
    ).toBeInTheDocument();
  });
});
