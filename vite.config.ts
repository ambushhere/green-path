import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => ({
  base: '/green-path/',
  plugins: [
    ...(mode === 'development'
      ? [(await import('kimi-plugin-inspect-react')).inspectAttr()]
      : []),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
