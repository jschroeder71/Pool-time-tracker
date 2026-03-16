import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set VITE_BASE to your GitHub repo name, e.g. /pool-time-tracker/
// Leave as "/" for custom domain or local dev
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
