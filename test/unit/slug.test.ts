import { describe, expect, it } from "vitest";
import { slugify } from "../../src/utils/slug.js";

describe("slugify", () => {
  it("creates a simple ASCII slug", () => {
    expect(slugify("Brainstorm on Garden Beds")).toBe("brainstorm-on-garden-beds");
  });

  it("falls back when the slug is empty", () => {
    expect(slugify("!!!")).toBe("untitled-chat");
  });
});
