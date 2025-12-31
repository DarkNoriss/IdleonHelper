import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "electron-vite"

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ["ws", "bufferutil", "utf-8-validate"],
      },
    },
  },
  preload: {},
  renderer: {
    resolve: {
      alias: [
        {
          find: /^@\/parsers\/?(.*)$/,
          replacement: path.resolve(__dirname, "./src/parsers/$1"),
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src/renderer/src"),
        },
      ],
    },
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
      tailwindcss(),
    ],
  },
})
