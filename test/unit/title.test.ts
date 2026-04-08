import { describe, expect, it } from "vitest";
import { deriveTitle } from "../../src/utils/title.js";

describe("deriveTitle", () => {
  it("prefers an explicit title", () => {
    expect(deriveTitle("Garden Bed Ideas")).toBe("Garden Bed Ideas");
  });

  it("falls back to untitled-chat", () => {
    expect(deriveTitle()).toBe("untitled-chat");
  });
});
