import { render, screen } from "@testing-library/react";
import MorpheusGuide, {
  MorpheusGuideDetail,
  MorpheusGuideHome,
} from "@/app/components/MorpheusGuide";

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-image" />,
}));

describe("MorpheusGuide bottom-nav 逃がし", () => {
  it("fixed配置ではバー分のtranslateYを当てる", () => {
    const { container } = render(
      <MorpheusGuide placement="fixed" expression="cheerful" message="やあ" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toContain("var(--bottom-nav-h");
  });

  it("inline配置ではtransformを当てない", () => {
    const { container } = render(
      <MorpheusGuide placement="inline" expression="cheerful" message="やあ" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.transform).toBe("");
  });

  it("夢詳細の固定ガイドはスマートフォン幅では本文を覆わないよう隠す", () => {
    const { container } = render(<MorpheusGuideDetail />);
    expect(container.firstChild).toHaveClass("hidden", "sm:flex");
  });

  it("ホームの固定ガイドは情報カードを覆わないよう初期状態を閉じる", () => {
    render(<MorpheusGuideHome title="きょうは？" message="おしえてね" />);
    expect(screen.queryByText("おしえてね")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "モルペウスのメッセージを開く" })).toBeInTheDocument();
  });
});
