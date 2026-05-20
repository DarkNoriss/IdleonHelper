import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/parsers\/?(.*)$/,
        replacement: path.resolve(import.meta.dirname, "./src/parsers/$1"),
      },
      {
        find: /^@\/types\/?(.*)$/,
        replacement: path.resolve(import.meta.dirname, "./src/types/$1"),
      },
      {
        find: /^@\/shared\/?(.*)$/,
        replacement: path.resolve(import.meta.dirname, "./src/shared/$1"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
