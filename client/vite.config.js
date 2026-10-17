import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin proxy so the browser never hits CORS and the API base
    // can stay a relative "/api" path in every environment.
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Firebase's free plan caps hosting transfer at 360 MB/day, so keeping the
    // app chunk small matters. The SDK and framework go into long-lived vendor
    // chunks that browsers reuse across deploys.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@firebase") || id.includes("/firebase/") || id.includes("firestore")) {
            return "firebase";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react";
          }
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
