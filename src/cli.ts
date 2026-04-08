import { runCli } from "./pipeline.js";

const args = process.argv.slice(2);

runCli(args).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
