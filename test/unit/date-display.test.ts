import { describe, expect, it } from "vitest";
import { formatConversationRange, formatExportedAt } from "../../src/utils/date-display.js";

describe("formatExportedAt", () => {
  it("formats ISO timestamps as human-readable local date/time", () => {
    expect(formatExportedAt("2026-04-08T12:00:00.000Z")).toBe("Apr 8, 2026");
  });

  it("falls back to the original value when the date is invalid", () => {
    expect(formatExportedAt("not-a-date")).toBe("not-a-date");
  });

  it("formats a same-day conversation range compactly", () => {
    expect(
      formatConversationRange([
        "2026-04-08T12:00:00.000Z",
        "2026-04-08T13:30:00.000Z"
      ])
    ).toBe("Apr 8, 2026");
  });

  it("formats a multi-day conversation range fully", () => {
    expect(
      formatConversationRange([
        "2026-04-08T23:00:00.000Z",
        "2026-04-10T01:15:00.000Z"
      ])
    ).toBe("Apr 8, 2026 to Apr 9, 2026");
  });

  it("returns null when no usable timestamps are present", () => {
    expect(formatConversationRange([undefined, "bad-date"])).toBeNull();
  });
});
