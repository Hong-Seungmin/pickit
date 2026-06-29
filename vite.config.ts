import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    target: "esnext",
    sourcemap: true,
  },
  // crxjs uses a dev server websocket for HMR; bind it explicitly.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});
