import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../dist", // or adjust output path if needed
  },
  server: {
    port: 1572,
  },
});
