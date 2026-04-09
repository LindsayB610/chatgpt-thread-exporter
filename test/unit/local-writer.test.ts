import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeLocalFile } from "../../src/writers/local.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "chatgpt-thread-exporter-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

describe("writeLocalFile", () => {
  it("creates parent directories and writes the file", async () => {
    const root = await createTempDir();
    const target = path.join(root, "exports", "nested", "thread.md");

    await writeLocalFile(target, "# Hello\n", false);

    await expect(readFile(target, "utf8")).resolves.toBe("# Hello\n");
  });

  it("refuses to overwrite an existing file without force", async () => {
    const root = await createTempDir();
    const target = path.join(root, "thread.md");
    await writeFile(target, "old\n", "utf8");

    await expect(writeLocalFile(target, "new\n", false)).rejects.toThrow(
      /Refusing to overwrite existing file without --force/
    );

    await expect(readFile(target, "utf8")).resolves.toBe("old\n");
  });

  it("allows overwrite when force is true", async () => {
    const root = await createTempDir();
    const target = path.join(root, "thread.md");
    await writeFile(target, "old\n", "utf8");

    await writeLocalFile(target, "new\n", true);

    await expect(readFile(target, "utf8")).resolves.toBe("new\n");
  });

  it("refuses to write onto an existing directory path", async () => {
    const root = await createTempDir();
    const targetDir = path.join(root, "exports");
    await mkdir(targetDir, { recursive: true });

    await expect(writeLocalFile(targetDir, "nope\n", true)).rejects.toThrow(
      /Refusing to write file content onto an existing directory/
    );
  });
});
