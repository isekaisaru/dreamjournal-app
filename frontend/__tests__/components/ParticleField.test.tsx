import { render } from "@testing-library/react";
import ParticleField from "@/app/components/forest/ParticleField";

describe("ParticleField", () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("does not crash when ResizeObserver is unavailable", () => {
    global.ResizeObserver = undefined as any;

    expect(() => {
      render(<ParticleField phase="day" season="summer" />);
    }).not.toThrow();
  });

  it("does not crash when canvas 2d context is unavailable", () => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null) as any;

    expect(() => {
      render(<ParticleField phase="day" season="summer" />);
    }).not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith("ParticleField canvas 2d context is unavailable");
  });
});
