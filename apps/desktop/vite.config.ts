import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 1420,
    host: true,
  },

  // Tauri expects dist/assets to be at the top level
  // https://tauri.app/guides/getting-started/prerequisites
  build: {
    target: ["es2021", "chrome105", "firefox102", "safari16"],
    outDir: "dist",
    sourcemap: !!process.env.TAURI_DEBUG || !!process.env.TAURI_APP_DEBUG,
  },
});
