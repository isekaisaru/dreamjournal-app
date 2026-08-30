import { render } from "@testing-library/react";
import ForestGuide from "@/app/components/forest/ForestGuide";

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-image" />,
}));

describe("ForestGuide responsive layout", () => {
  it("スマートフォン幅では森とボトムナビを覆わないよう隠す", () => {
    const { container } = render(<ForestGuide variant="forest" profiles={[]} />);
    expect(container.firstChild).toHaveClass("hidden", "sm:flex");
  });
});
