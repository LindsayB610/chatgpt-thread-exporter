import { readFileSync } from "node:fs";
import path from "node:path";

const sharedLinksDir = path.resolve(import.meta.dirname, "../fixtures/shared-links");

export function getSharedLinkFixturePath(fileName: string): string {
  return path.join(sharedLinksDir, fileName);
}

export function readSharedLinkFixture(fileName: string): string {
  return readFileSync(getSharedLinkFixturePath(fileName), "utf8");
}
