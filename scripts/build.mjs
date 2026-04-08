import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });

await new Promise((resolve, reject) => {
  const child = spawn("npx", ["tsc", "-p", "tsconfig.build.json"], {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }

    reject(new Error(`Build failed with exit code ${code ?? "unknown"}`));
  });

  child.on("error", reject);
});
