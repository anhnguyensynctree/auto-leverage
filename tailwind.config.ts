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
        "on-surface": "#111c2d",
        "on-surface-variant": "#434655",
        surface: "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#c3c6d7",
        outline: "#737686",
        primary: "#004ac6",
        "on-primary-fixed-variant": "#003ea8",
        "primary-container": "#2563eb",
        "on-primary-container": "#eeefff",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
