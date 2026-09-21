import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Prefer IPv4 — on Windows `localhost` often resolves to ::1 while the
      // Express server binds 127.0.0.1 only, which breaks the Vite API proxy.
      "/api": "http://127.0.0.1:3000",
    },
  },
});
