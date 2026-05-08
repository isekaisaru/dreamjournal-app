import "@testing-library/jest-dom/jest-globals";

// Mock framer-motion to prevent JSDOM issues
jest.mock("framer-motion", () => {
  const React = require("react");
  const MotionConfig = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef(({ children, ...props }: any, ref: any) => {
          const {
            animate,
            custom,
            drag,
            dragConstraints,
            exit,
            initial,
            layout,
            layoutId,
            onAnimationComplete,
            onAnimationStart,
            transition,
            variants,
            viewport,
            whileDrag,
            whileFocus,
            whileHover,
            whileInView,
            whileTap,
            ...rest
          } = props;

          return React.createElement(tag, { ref, ...rest }, children);
        }),
    }
  );

  return {
    MotionConfig,
    motion,
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});
