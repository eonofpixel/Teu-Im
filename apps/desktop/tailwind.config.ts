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
        gray: {
          750: "#2d3748", // between gray-700 and gray-800
        },
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },

  darkMode: "class",

  plugins: [],
} satisfies Config;

export default config;
