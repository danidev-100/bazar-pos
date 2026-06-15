/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pos: {
          primary: "var(--color-pos-primary)",
          secondary: "var(--color-pos-secondary)",
          accent: "var(--color-pos-accent)",
          danger: "var(--color-pos-danger)",
          success: "var(--color-pos-success)",
          background: "var(--color-pos-background)",
          surface: "var(--color-pos-surface)",
          text: "var(--color-pos-text)",
          muted: "var(--color-pos-muted)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
