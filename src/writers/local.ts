import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writeLocalFile(path: string, content: string, force: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  if (!force) {
    const exists = await fileExists(path);
    if (exists) {
      throw new Error(`Refusing to overwrite existing file without --force: ${path}`);
    }
  }

  await writeFile(path, content, "utf8");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
