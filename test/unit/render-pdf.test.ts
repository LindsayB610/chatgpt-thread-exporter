import { beforeEach, describe, expect, it, vi } from "vitest";

const closeMock = vi.fn().mockResolvedValue(undefined);
const pdfMock = vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
const emulateMediaMock = vi.fn().mockResolvedValue(undefined);
const setContentMock = vi.fn().mockResolvedValue(undefined);
const newPageMock = vi.fn().mockResolvedValue({
  setContent: setContentMock,
  emulateMedia: emulateMediaMock,
  pdf: pdfMock
});
const launchMock = vi.fn().mockResolvedValue({
  newPage: newPageMock,
  close: closeMock
});

vi.mock("playwright", () => ({
  chromium: {
    launch: launchMock
  }
}));

describe("renderPdf", () => {
  beforeEach(() => {
    closeMock.mockClear();
    pdfMock.mockClear();
    emulateMediaMock.mockClear();
    setContentMock.mockClear();
    newPageMock.mockClear();
    launchMock.mockClear();
  });

  it("renders a PDF with page numbers in the footer", async () => {
    const { renderPdf } = await import("../../src/pdf/render-pdf.js");

    await renderPdf({
      sourceUrl: "https://chatgpt.com/share/example",
      finalUrl: "https://chatgpt.com/share/example",
      exportedAt: "2026-04-09T00:00:00.000Z",
      title: "Footer Test",
      turns: [
        {
          id: "user-1",
          role: "user",
          blocks: [{ kind: "text", text: "Hello world" }]
        }
      ]
    });

    expect(launchMock).toHaveBeenCalledWith({ headless: true });
    expect(pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: expect.stringContaining('class="pageNumber"')
      })
    );
    expect(pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        footerTemplate: expect.stringContaining('class="totalPages"')
      })
    );
  });
});
