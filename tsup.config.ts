import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/global.ts"],
  format: ["esm", "cjs"],
  dts: true,
  external: [
    "react",
    "@mui/material",
    "@mui/system",
    "@emotion/react",
    "@emotion/styled",
    "react-dom",
    "react-router-dom",
  ],
});
