import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  server: { host: "0.0.0.0" },
  build: { chunkSizeWarningLimit: 1200 },
});
