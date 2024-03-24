import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'dreamy-blue': '#5D5FEE',
        'night-sky': '#2D31FA',
        'soft-pink': '#F3A1C9',
        'calm-purple': '#A593E0',
      },
      fontFamily: {
        'dreamy': ['"Your Custom Font"', 'sans-serif'],
      },
      backgroundImage: {
        'dreamy-sky': "url('/path/to/your/background/image')",
        'gradient-dreamy': "linear-gradient(to right, #5D5FEE, #A593E0)",
      },
      boxShadow: {
        'soft-dream': '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'dreamy': '1rem',
      },
      backgroundImage2: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;