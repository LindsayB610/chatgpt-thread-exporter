import { describe, expect, it } from "vitest";
import { extractConversationPayload } from "../../src/extractor.js";
import { readSharedLinkFixture } from "../helpers/fixtures.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe("extractConversationPayload fixture targets", () => {
  it("detects the current streamed share-page transport and extracts the title", () => {
    const result = extractConversationPayload(readSharedLinkFixture("live-stream-thread.fixture.html"));
    const payload = asRecord(result.payload);

    expect(payload.transport).toBe("react-router-stream");
    expect(payload.title).toBe("Story Time Practice");
    expect(payload.sharedConversationId).toBe("11111111-2222-4333-8444-555555555555");
    expect(result.metadata).toMatchObject({
      strategy: "react-router-stream-regex"
    });
  });

  it("recovers stream metadata needed for later parsing stages", () => {
    const result = extractConversationPayload(readSharedLinkFixture("live-stream-thread.fixture.html"));
    const payload = asRecord(result.payload);

    expect(payload.continueConversationUrl).toBe(
      "https://chatgpt.com/share/11111111-2222-4333-8444-555555555555/continue"
    );
    expect(payload.backingConversationId).toBe("aaaaaaa1-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(payload.linearConversation).toEqual([50, 60]);
    expect(result.metadata).toMatchObject({
      chunkCount: 1
    });
  });

  it("combines metadata that arrives across multiple streamed chunks", () => {
    const html = `
      <script>
        window.__reactRouterContext.streamController.enqueue(
          "[\\"title\\",\\"Split Stream Thread\\",\\"sharedConversationId\\",\\"split-share-id\\"]"
        );
      </script>
      <script>
        window.__reactRouterContext.streamController.enqueue(
          "[\\"linear_conversation\\",[1,2,3],\\"continue_conversation_url\\",\\"https://chatgpt.com/share/split-share-id/continue\\",\\"backing_conversation_id\\",\\"backing-split-id\\"]"
        );
      </script>
    `;

    const result = extractConversationPayload(html);
    const payload = asRecord(result.payload);

    expect(payload.transport).toBe("react-router-stream");
    expect(payload.title).toBe("Split Stream Thread");
    expect(payload.sharedConversationId).toBe("split-share-id");
    expect(payload.continueConversationUrl).toBe(
      "https://chatgpt.com/share/split-share-id/continue"
    );
    expect(payload.backingConversationId).toBe("backing-split-id");
    expect(payload.linearConversation).toEqual([1, 2, 3]);
    expect(result.metadata).toMatchObject({
      chunkCount: 2
    });
  });

  it("extracts real message parts from a streamed share payload", () => {
    const html = `
      <script>
        window.__reactRouterContext.streamController.enqueue(
          "[\\"sharedConversationId\\",\\"sample-share-id\\",\\"title\\",\\"Sample Stream Thread\\",\\"linear_conversation\\",[8,23],\\"id\\",\\"message\\",{\\"_6\\":9,\\"_7\\":10},\\"message-user\\",{\\"_11\\":12,\\"_13\\":14,\\"_15\\":16},\\"author\\",{\\"_17\\":18},\\"content\\",{\\"_19\\":20,\\"_21\\":22},\\"metadata\\",{},\\"role\\",\\"user\\",\\"content_type\\",\\"text\\",\\"parts\\",[\\"Hello from the user\\"],{\\"_6\\":24,\\"_7\\":25},\\"message-assistant\\",{\\"_11\\":26,\\"_13\\":27,\\"_15\\":16},{\\"_17\\":28},{\\"_19\\":20,\\"_21\\":29},\\"assistant\\",[\\"Hello from the assistant\\"]]"
        );
      </script>
    `;

    const result = extractConversationPayload(html);
    const payload = asRecord(result.payload);

    expect(payload.transport).toBe("react-router-stream");
    expect(payload.messages).toMatchObject([
      {
        id: "message-user",
        role: "user",
        parts: [{ type: "text", text: "Hello from the user" }]
      },
      {
        id: "message-assistant",
        role: "assistant",
        parts: [{ type: "text", text: "Hello from the assistant" }]
      }
    ]);
  });

  it("prefers metadata from the share payload region over earlier decoy keys", () => {
    const html = `
      <script>
        window.__reactRouterContext.streamController.enqueue(
          "[\\"title\\",\\"Decoy Title\\",\\"continue_conversation_url\\",\\"https://example.com/decoy\\"]"
        );
      </script>
      <script>
        window.__reactRouterContext.streamController.enqueue(
          "[\\"sharedConversationId\\",\\"real-share-id\\",\\"title\\",\\"Real Share Title\\",\\"linear_conversation\\",[7,8],\\"continue_conversation_url\\",\\"https://chatgpt.com/share/real-share-id/continue\\",\\"backing_conversation_id\\",\\"backing-real-id\\"]"
        );
      </script>
    `;

    const result = extractConversationPayload(html);
    const payload = asRecord(result.payload);

    expect(payload.sharedConversationId).toBe("real-share-id");
    expect(payload.title).toBe("Real Share Title");
    expect(payload.continueConversationUrl).toBe(
      "https://chatgpt.com/share/real-share-id/continue"
    );
    expect(payload.backingConversationId).toBe("backing-real-id");
    expect(payload.linearConversation).toEqual([7, 8]);
  });

  it("extracts plain-text message trees from the synthetic next-data fixture", () => {
    const result = extractConversationPayload(readSharedLinkFixture("plain-text-thread.fixture.html"));
    const payload = asRecord(result.payload);

    expect(payload.transport).toBe("next-data");
    expect(payload.title).toBe("Planning a neighborhood potluck");
    expect(payload.messages).toMatchObject([
      {
        id: "user-1",
        role: "user"
      },
      {
        id: "assistant-1",
        role: "assistant"
      }
    ]);
    expect(result.metadata).toMatchObject({
      strategy: "next-data-json"
    });
  });

  it("preserves code block parts and richer metadata from synthetic fixtures", () => {
    const codeResult = extractConversationPayload(readSharedLinkFixture("code-block-thread.fixture.html"));
    const codePayload = asRecord(codeResult.payload);
    const codeMessages = codePayload.messages as Array<Record<string, unknown>>;
    const codeParts = codeMessages[1]?.parts as Array<Record<string, unknown>>;

    expect(codeParts).toContainEqual(
      expect.objectContaining({
        type: "code",
        language: "ts"
      })
    );

    const richResult = extractConversationPayload(readSharedLinkFixture("rich-content-thread.fixture.html"));
    const richPayload = asRecord(richResult.payload);
    const richMessages = richPayload.messages as Array<Record<string, unknown>>;
    const richParts = richMessages[1]?.parts as Array<Record<string, unknown>>;

    expect(richParts).toContainEqual(
      expect.objectContaining({
        type: "image_reference",
        name: "hero-shortlist-1.jpg"
      })
    );
  });

  it("keeps partial-thread markers from synthetic fixtures", () => {
    const result = extractConversationPayload(readSharedLinkFixture("partial-thread.fixture.html"));
    const payload = asRecord(result.payload);

    expect(payload.isPartial).toBe(true);
    expect(payload.title).toBe("Road trip packing list");
  });

  it("throws a clear parser error for malformed fixtures", () => {
    expect(() =>
      extractConversationPayload(readSharedLinkFixture("malformed-missing-next-data.fixture.html"))
    ).toThrow(/react router stream payload|__NEXT_DATA__|shared-link payload/i);
  });
});
