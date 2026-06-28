import { render, screen } from "@testing-library/react";
import MorpheusHero from "@/app/components/MorpheusHero";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

describe("MorpheusHero", () => {
  it("title/messageとテーマ連動の後光リングを描画する", () => {
    const { container } = render(
      <MorpheusHero title="おかえり！" message="今日の夢を聞かせてね。" />
    );

    expect(screen.getByText("おかえり！")).toBeInTheDocument();
    expect(screen.getByText("今日の夢を聞かせてね。")).toBeInTheDocument();
    expect(
      container.querySelector('[aria-hidden="true"].animate-moon-pulse')
    ).toBeTruthy();
  });

  it("既定ではMorpheusImageをトークンサイズでレスポンシブ描画する", () => {
    render(<MorpheusHero title="おかえり！" message="今日の夢を聞かせてね。" />);

    const image = screen.getByAltText("ホーム画面で見守るモルペウス");
    expect(image).toHaveAttribute("width", "320");
    expect(image).toHaveAttribute("height", "320");
    expect(image).toHaveStyle({
      width: "var(--morpheus-hero)",
      height: "var(--morpheus-hero)",
    });
  });

  it("size指定時は後方互換として固定サイズ描画に戻せる", () => {
    render(
      <MorpheusHero
        title="おかえり！"
        message="今日の夢を聞かせてね。"
        size={150}
      />
    );

    const image = screen.getByAltText("ホーム画面で見守るモルペウス");
    expect(image).toHaveAttribute("width", "150");
    expect(image).toHaveAttribute("height", "150");
    expect(image).not.toHaveStyle({ width: "var(--morpheus-hero)" });
  });
});
