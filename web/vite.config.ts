import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/admin": "http://localhost:3000",
      "/service-records": "http://localhost:3000",
      "/families": "http://localhost:3000",
      "/persons": "http://localhost:3000",
      "/memberships": "http://localhost:3000",
      "/inventory": "http://localhost:3000",
    },
  },
});
