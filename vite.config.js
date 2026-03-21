import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Set this to your GitHub repo name if deploying to GitHub Pages
  // e.g. if your repo is github.com/yourname/pool-time → base: "/pool-time/"
  // If using a custom domain → base: "/"
  base: "/Pool-time-tracker/",

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
    port: 3000,
    open: true,
  },
});
