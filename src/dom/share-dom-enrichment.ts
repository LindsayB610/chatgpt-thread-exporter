import { chromium } from "playwright";
import type { ExtractResult } from "../types.js";

export type ResolvedShareImage = {
  url: string;
  alt?: string;
};

export type ResolvedShareLink = {
  url: string;
  text?: string;
};

export type ResolvedShareArtifacts = {
  images: ResolvedShareImage[];
  links: ResolvedShareLink[];
};

export async function resolveRenderedShareArtifacts(
  shareUrl: string
): Promise<ResolvedShareArtifacts> {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    return emptyArtifacts();
  }

  try {
    const page = await browser.newPage();
    await page.goto(shareUrl, { waitUntil: "networkidle", timeout: 60_000 });

    return await page.evaluate(() => {
      const images: Array<{ url: string; alt?: string }> = [];
      const links: Array<{ url: string; text?: string }> = [];
      const seenImages = new Set<string>();
      const seenLinks = new Set<string>();

      for (const image of Array.from(document.querySelectorAll("img"))) {
        const src = image.getAttribute("src");
        const alt = image.getAttribute("alt") ?? undefined;
        const width = Number(image.getAttribute("width") ?? "0");
        const height = Number(image.getAttribute("height") ?? "0");

        if (!src || !src.startsWith("http")) {
          continue;
        }

        if (src.includes("share-og.png")) {
          continue;
        }

        if (width > 0 && height > 0 && width <= 128 && height <= 128) {
          continue;
        }

        if (seenImages.has(src)) {
          continue;
        }

        seenImages.add(src);
        images.push({ url: src, alt });
      }

      for (const link of Array.from(document.querySelectorAll("a"))) {
        const href = link.getAttribute("href");
        const text = (link.textContent || "").trim() || undefined;

        if (!href || !href.startsWith("http")) {
          continue;
        }

        if (href.includes("/pricing/")) {
          continue;
        }

        if (seenLinks.has(href)) {
          continue;
        }

        seenLinks.add(href);
        links.push({ url: href, text });
      }

      return { images, links };
    });
  } catch {
    return emptyArtifacts();
  } finally {
    await browser.close();
  }
}

export function hasDomEnrichableParts(extractResult: ExtractResult): boolean {
  const payload = asRecord(extractResult.payload);
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return messages.some((message) => {
    const record = asRecord(message);
    const parts = Array.isArray(record.parts) ? record.parts : [];
    return parts.some((part) => asRecord(part).type === "image_reference");
  });
}

export function injectResolvedShareArtifacts(
  extractResult: ExtractResult,
  artifacts: ResolvedShareArtifacts
): ExtractResult {
  if (artifacts.images.length === 0) {
    return extractResult;
  }

  const payload = asRecord(extractResult.payload);
  const messages = Array.isArray(payload.messages) ? payload.messages : null;

  if (!messages) {
    return extractResult;
  }

  let imageIndex = 0;

  const nextMessages = messages.map((message) => {
    const record = asRecord(message);
    const parts = Array.isArray(record.parts) ? record.parts : null;

    if (!parts) {
      return message;
    }

    const nextParts = parts.map((part) => {
      const partRecord = asRecord(part);

      if (partRecord.type !== "image_reference") {
        return part;
      }

      const resolved = artifacts.images[imageIndex];
      imageIndex += 1;

      if (!resolved) {
        return part;
      }

      return {
        ...partRecord,
        url: resolved.url,
        name:
          typeof partRecord.name === "string" && partRecord.name.length > 0
            ? partRecord.name
            : resolved.alt
      };
    });

    return {
      ...record,
      parts: nextParts
    };
  });

  return {
    ...extractResult,
    metadata: {
      ...(extractResult.metadata ?? {}),
      domEnrichment: {
        imagesResolved: artifacts.images.length,
        linksResolved: artifacts.links.length
      }
    },
    payload: {
      ...payload,
      messages: nextMessages
    }
  };
}

function emptyArtifacts(): ResolvedShareArtifacts {
  return { images: [], links: [] };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
