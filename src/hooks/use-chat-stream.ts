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

export function useChatStream(
  chatId: string,
  onMessage: (message: StreamMessage) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/messages/chats/${chatId}/stream`);
    eventSourceRef.current = es;

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
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          connect();
        }
      }, 3000);
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
