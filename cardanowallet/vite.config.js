import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig(({ command }) => {
  const isProduction = command === "build";

  return {
    base: "./",
    define: {
      global: "window",
      "process.env.NODE_ENV": JSON.stringify(
        isProduction ? "production" : "development"
      ),
      "process.version": JSON.stringify("v16.0.0"),
    },
    plugins: [
      nodePolyfills({
        exclude: ["fs"],
      }),
      wasm(),
      topLevelAwait(),
    ],
  };
});
