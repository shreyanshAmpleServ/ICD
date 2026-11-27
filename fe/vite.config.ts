import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// `vite build --mode single` produces one self-contained HTML preview file.
export default defineConfig(({ mode }) => {
  const defineEnv: Record<string, string> = {};
  if (mode === "development") {
    const fallbackDevEnv = loadEnv("development", __dirname);
    const primaryLocalEnv = loadEnv("", __dirname);
    const merged = { ...fallbackDevEnv, ...primaryLocalEnv };
    for (const [key, val] of Object.entries(merged)) {
      if (key.startsWith("VITE_")) {
        defineEnv[`import.meta.env.${key}`] = JSON.stringify(val);
      }
    }
  }

  return {
    define: defineEnv,
    plugins: [react(), ...(mode === "single" ? [viteSingleFile()] : [])],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: mode === "single" ? "dist-single" : "dist",
      chunkSizeWarningLimit: 4000,
    },
  };
});
