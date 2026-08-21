import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("client/dist");
const dest = resolve("dist");

if (!existsSync(src)) {
  console.error("client/dist is missing — Vite build did not run");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("copied client/dist -> dist");
