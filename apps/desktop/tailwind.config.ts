import type { Config } from "tailwindcss";

const config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        // Custom brand colors
        brand: {
          primary: "#6366f1",  // indigo-500
          secondary: "#10b981", // emerald-500
          accent: "#8b5cf6",   // violet-500
        },
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },

  darkMode: "class",

  plugins: [],
} satisfies Config;

export default config;
