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
        surface: "#0a0a0f",
        "surface-container-lowest": "#0d0d18",
        "surface-container-low": "#111128",
        "surface-container": "#161632",
        "surface-container-high": "#1a1a3a",
        "on-surface": "#f1f5f9",
        "on-surface-variant": "#94a3b8",
        "on-background": "#f1f5f9",
        secondary: "#64748b",
        outline: "#334155",
        "outline-variant": "#1e1e3a",
        primary: "#6366f1",
        "on-primary-fixed-variant": "#4f46e5",
        "primary-container": "#4338ca",
        "on-primary-container": "#eef2ff",
        error: "#f87171",
        "error-container": "#1c0808",
        "on-error-container": "#fca5a5",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(99, 102, 241, 0.35)",
        "glow-sm": "0 0 12px rgba(99, 102, 241, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
