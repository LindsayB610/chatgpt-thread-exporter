import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const projectRoot = new URL("../../", import.meta.url);

describe("package contract", () => {
  it("points the package command at a Node entrypoint", async () => {
    const cliUrl = await publishedCliUrl();

    await expect(readFile(cliUrl, "utf8")).resolves.toMatch(
      /^#!\/usr\/bin\/env node\n/
    );
  });

  it.skipIf(process.platform === "win32")(
    "builds the published CLI as an executable",
    async () => {
      await expect(access(await publishedCliUrl(), constants.X_OK)).resolves.toBeUndefined();
    }
  );
});

async function publishedCliUrl(): Promise<URL> {
  const packageJson = JSON.parse(
    await readFile(new URL("package.json", projectRoot), "utf8")
  ) as { bin?: Record<string, string> };
  const cliPath = packageJson.bin?.["chatgpt-thread-exporter"];

  expect(cliPath).toBe("./dist/cli.js");
  return new URL(cliPath ?? "", projectRoot);
}
