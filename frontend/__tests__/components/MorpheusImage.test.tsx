import { render, screen } from "@testing-library/react";
import MorpheusImage from "@/app/components/MorpheusImage";

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

describe("MorpheusImage", () => {
  it("cssSize指定時はintrinsic sizeを保ち、描画サイズだけCSSで可変にする", () => {
    render(<MorpheusImage variant="home" cssSize="var(--morpheus-hero)" />);

    const image = screen.getByAltText("ホーム画面で見守るモルペウス");
    expect(image).toHaveAttribute("width", "320");
    expect(image).toHaveAttribute("height", "320");
    expect(image).toHaveAttribute("sizes", "var(--morpheus-hero)");
    expect(image).toHaveStyle({
      width: "var(--morpheus-hero)",
      height: "var(--morpheus-hero)",
    });
  });

  it("cssSize未指定時は従来どおり数値sizeで描画する", () => {
    render(<MorpheusImage variant="home" size={88} />);

    const image = screen.getByAltText("ホーム画面で見守るモルペウス");
    expect(image).toHaveAttribute("width", "88");
    expect(image).toHaveAttribute("height", "88");
    expect(image).toHaveAttribute("sizes", "88px");
    expect(image).not.toHaveStyle({ width: "var(--morpheus-hero)" });
  });
});
