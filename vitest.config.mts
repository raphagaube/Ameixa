import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mesmo alias do tsconfig, senão os testes não enxergam "@/..."
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Testes de componente pedem o DOM por arquivo, com a marcação
    // "@vitest-environment jsdom" no topo. Os de lógica pura rodam sem DOM,
    // que é bem mais rápido.
  },
});
