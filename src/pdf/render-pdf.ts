import { chromium } from "playwright";
import type { ExportTranscript } from "../types.js";
import { renderChatGptHtml } from "./render-chatgpt-html.js";

export async function renderPdf(transcript: ExportTranscript): Promise<Uint8Array> {
  const html = renderChatGptHtml(transcript);
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch (error: unknown) {
    throw new Error(
      `PDF export requires a Playwright browser install. Run "npx playwright install chromium" and try again. ${getErrorMessage(error)}`
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm"
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
