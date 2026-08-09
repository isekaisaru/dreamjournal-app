import { render } from "@testing-library/react";
import MorpheusGuide from "@/app/components/MorpheusGuide";

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
});
