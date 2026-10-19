import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages hosts this repository under /attendance-app-v2/.
// Keep the root path for local development.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/attendance-app-v2/" : "/",
  plugins: [react()],
  build: {
    target: "es2022",
    cssCodeSplit: true
  }
}));
