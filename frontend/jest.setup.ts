import "@testing-library/jest-dom";

// Mock framer-motion to prevent JSDOM issues
jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => {
        return React.createElement("div", { ref, ...props }, children);
      }),
    },
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
  };
});
