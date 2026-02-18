"use client";
import { useEffect, useRef, useCallback } from "react";

interface StreamMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
}

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

export function useChatStream(
  chatId: string,
  onMessage: (message: StreamMessage) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  const retryCountRef = useRef(0);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/messages/chats/${chatId}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message" && data.message) {
          onMessageRef.current(data.message);
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      if (retryCountRef.current >= MAX_RETRIES) return;

      // Exponential backoff with jitter
      const exponentialDelay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
      const jitter = Math.random() * 1000;
      const delay = Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
      retryCountRef.current += 1;

      setTimeout(() => {
        if (eventSourceRef.current === es) {
          connect();
        }
      }, delay);
    };
  }, [chatId]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);
}
