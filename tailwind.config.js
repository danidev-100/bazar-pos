/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pos: {
          primary: "#1e3a5f",
          secondary: "#4a90d9",
          accent: "#f5a623",
          danger: "#d32f2f",
          success: "#388e3c",
          background: "#f5f7fa",
          surface: "#ffffff",
          text: "#1a1a2e",
          muted: "#6b7280",
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
