// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChatStream } from "../use-chat-stream";

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close = vi.fn();
}

describe("useChatStream", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects to correct URL", () => {
    const onMessage = vi.fn();
    renderHook(() => useChatStream("chat-123", onMessage));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/messages/chats/chat-123/stream");
  });

  it("calls onMessage when receiving a message event", () => {
    const onMessage = vi.fn();
    renderHook(() => useChatStream("chat-123", onMessage));
    const es = MockEventSource.instances[0];
    const messageData = {
      type: "message",
      message: { id: "m1", senderId: "u1", senderName: "User", text: "Hello", imageUrl: null, createdAt: "2025-01-01" },
    };
    es.onmessage!(new MessageEvent("message", { data: JSON.stringify(messageData) }));
    expect(onMessage).toHaveBeenCalledWith(messageData.message);
  });

  it("does not call onMessage for non-message events", () => {
    const onMessage = vi.fn();
    renderHook(() => useChatStream("chat-123", onMessage));
    const es = MockEventSource.instances[0];
    es.onmessage!(new MessageEvent("message", { data: JSON.stringify({ type: "ping" }) }));
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("reconnects on error after delay", () => {
    const onMessage = vi.fn();
    renderHook(() => useChatStream("chat-123", onMessage));
    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];
    es.onerror!();
    expect(es.close).toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("closes EventSource on unmount", () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() => useChatStream("chat-123", onMessage));
    const es = MockEventSource.instances[0];
    unmount();
    expect(es.close).toHaveBeenCalled();
  });

  it("handles invalid JSON gracefully", () => {
    const onMessage = vi.fn();
    renderHook(() => useChatStream("chat-123", onMessage));
    const es = MockEventSource.instances[0];
    es.onmessage!(new MessageEvent("message", { data: "not-json" }));
    expect(onMessage).not.toHaveBeenCalled();
  });
});
