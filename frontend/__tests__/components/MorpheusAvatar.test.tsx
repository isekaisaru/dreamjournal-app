import { render, screen } from "@testing-library/react";
import MorpheusAvatar from "@/app/components/MorpheusAvatar";

describe("MorpheusAvatar", () => {
  it("variantに応じた画像とaltで描画する", () => {
    render(<MorpheusAvatar variant="analysis" />);
    const img = screen.getByAltText("夢の本を読んで分析しているモルペウス");
    expect(img.getAttribute("src")).toContain("morpheus-analysis");
  });

  it("円形クロップ構造（rounded-full + overflow-hidden）を持つ", () => {
    const { container } = render(<MorpheusAvatar variant="analysis" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("rounded-full");
    expect(wrapper.className).toContain("overflow-hidden");
  });

  it("後光(animate-moon-pulse)を付けない", () => {
    const { container } = render(<MorpheusAvatar variant="analysis" />);
    expect(container.innerHTML).not.toContain("animate-moon-pulse");
  });
});
