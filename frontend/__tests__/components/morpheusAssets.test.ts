import { MORPHEUS_IMAGE_SRC, ALT_BY_VARIANT } from "@/app/components/morpheusAssets";

describe("morpheusAssets", () => {
  it("src と alt が同じ variant 集合を網羅する", () => {
    const srcKeys = Object.keys(MORPHEUS_IMAGE_SRC).sort();
    const altKeys = Object.keys(ALT_BY_VARIANT).sort();
    expect(srcKeys.length).toBeGreaterThan(0);
    expect(srcKeys).toEqual(altKeys);
  });
  it("analysis variant の src は morpheus-analysis 画像を指す", () => {
    expect(MORPHEUS_IMAGE_SRC.analysis).toContain("morpheus-analysis");
  });
});
