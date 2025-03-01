import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    "tfhe",
    "node-tfhe",
    "ethers",
    "zustand",
    "tweetnacl",
    "tweetnacl-util",
  ],
  esbuildOptions(options) {
    options.assetNames = "assets/[name]";
    options.loader = {
      ...options.loader,
      ".wasm": "file",
    };
  },
});
