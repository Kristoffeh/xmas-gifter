import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        night: { DEFAULT: "#0E1A2B", soft: "#17293F", line: "#2A3F5C" },
        spruce: { DEFAULT: "#1F5A43", dark: "#17463A" },
        berry: { DEFAULT: "#C2303A", dark: "#9E2530" },
        candle: "#F0B84E",
        snow: "#F4F7FB",
        frost: "#A9BCD0",
        ink: "#13202F",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;





