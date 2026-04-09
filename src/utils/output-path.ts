import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { slugify } from "./slug.js";

export async function resolveDefaultOutPath(title: string): Promise<string> {
  const downloadsDir = path.join(homedir(), "Downloads");
  const slug = slugify(title);

  for (let index = 0; index < 10_000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const candidate = path.join(downloadsDir, `${slug}-export${suffix}.md`);

    if (!(await pathExists(candidate))) {
      return candidate;
    }
  }

  throw new Error("Could not find an available default export filename in Downloads.");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
