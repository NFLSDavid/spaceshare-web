"use client";
import { useState, useEffect, useRef, use } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import { Send, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface ChatData {
  id: string;
  title: string;
  photoUrl: string | null;
  messages: MessageData[];
  members: { userId: string; user: { id: string; firstName: string; lastName: string } }[];
}

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Use SSE for real-time messages
  useChatStream(chatId, (message) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  });

  async function fetchChat() {
    try {
      const res = await fetch(`/api/messages/chats/${chatId}`);
      const data = await res.json();
      setChat(data);
      setMessages(data.messages);
    } catch {
      toast("Failed to load chat", "error");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/messages/chats/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage }),
      });
      if (res.ok) {
        const msg = await res.json();
        setNewMessage("");
        // Add message immediately for instant feedback
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      toast("Failed to send message", "error");
    }
    setSending(false);
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "spaceshare/messages");

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await uploadRes.json();

      const res = await fetch(`/api/messages/chats/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      toast("Failed to send image", "error");
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Link href="/messages" className="p-1 rounded-full hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {chat?.photoUrl && (
          <img src={chat.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
        )}
        <h2 className="font-semibold text-sm">{chat?.title || "Chat"}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-4 py-2", isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900")}>
                {!isMe && <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>}
                {msg.imageUrl ? (
                  <img src={msg.imageUrl} alt="" className="rounded-lg max-w-full max-h-60 object-cover" />
                ) : (
                  <p className="text-sm">{msg.text}</p>
                )}
                <p className={cn("text-[10px] mt-1", isMe ? "text-blue-200" : "text-gray-400")}>
                  {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 pt-4 border-t">
        <label className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
          <ImageIcon className="h-5 w-5 text-gray-400" />
          <input type="file" accept="image/*" className="hidden" onChange={sendImage} />
        </label>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button type="submit" size="sm" className="rounded-full px-3" disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
