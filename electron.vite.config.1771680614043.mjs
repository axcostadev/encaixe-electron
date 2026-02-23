// electron.vite.config.mjs
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";
var electron_vite_config_default = defineConfig({
  define: {
    "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version)
  },
  publicDir: "resources",
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        // during development point to source files so Vite can watch them
        "machine-work-state": process.env.NODE_ENV === "development" ? resolve("src/renderer/machine-work-state/frontend/src") : resolve("src/renderer/dist/machine-work-state/machine-work-state.es.js")
      }
    },
    plugins: [react(), tailwindcss()]
  }
});
export {
  electron_vite_config_default as default
};
