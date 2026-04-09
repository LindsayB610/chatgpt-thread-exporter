import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Stats } from "node:fs";

export async function writeLocalFile(path: string, content: string, force: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const existingStats = await getPathStats(path);

  if (existingStats?.isDirectory()) {
    throw new Error(`Refusing to write file content onto an existing directory: ${path}`);
  }

  if (!force && existingStats) {
    throw new Error(`Refusing to overwrite existing file without --force: ${path}`);
  }

  await writeFile(path, content, "utf8");
}

async function getPathStats(path: string): Promise<Stats | null> {
  try {
    return await stat(path);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
