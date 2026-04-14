import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/green-path/',
  plugins: [
    ...(mode === 'development'
      ? [import('kimi-plugin-inspect-react').then((m) => m.inspectAttr())]
      : []),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
