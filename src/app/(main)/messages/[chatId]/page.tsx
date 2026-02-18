"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import { Send, ArrowLeft, Image as ImageIcon, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
}

interface ListingSnippet {
  id: string;
  title: string;
  price: number;
  photos: string[];
  isActive: boolean;
  deletedAt: string | null;
}

interface ChatData {
  id: string;
  title: string;
  photoUrl: string | null;
  messages: MessageData[];
  members: { userId: string; user: { id: string; firstName: string; lastName: string } }[];
  listing: ListingSnippet | null;
}

export default function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track whether chat was empty on load and whether any message was sent this session
  const hadNoMessagesOnLoad = useRef(false);
  const messagesSentInSession = useRef(false);

  useEffect(() => {
    fetchChat();
  }, [chatId]);

  // Auto-delete the chat on unmount if it was empty when we arrived and we never sent anything
  useEffect(() => {
    return () => {
      if (hadNoMessagesOnLoad.current && !messagesSentInSession.current) {
        fetch(`/api/messages/chats/${chatId}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
      }
    };
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
      if (!res.ok) { toast(data.error || "Failed to load chat", "error"); return; }
      setChat(data);
      const msgs = data.messages ?? [];
      setMessages(msgs);
      if (msgs.length === 0) {
        hadNoMessagesOnLoad.current = true;
      }
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
        messagesSentInSession.current = true;
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
        messagesSentInSession.current = true;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch {
      toast("Failed to send image", "error");
    }
  }

  async function deleteChat() {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      // Clear the auto-delete flag so the unmount effect doesn't double-fire
      hadNoMessagesOnLoad.current = false;
      const res = await fetch(`/api/messages/chats/${chatId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to delete chat", "error");
        return;
      }
      router.push("/messages");
    } catch {
      toast("Failed to delete chat", "error");
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="pb-4 border-b space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {chat?.photoUrl && (
            <img src={chat.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          )}
          <h2 className="font-semibold text-sm flex-1">{chat?.title || "Chat"}</h2>
          <button
            onClick={deleteChat}
            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Listing Banner */}
        {chat?.listing && (() => {
          const unavailable = chat.listing.deletedAt || !chat.listing.isActive;
          if (unavailable) {
            return (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5 opacity-60">
                {chat.listing.photos[0] && (
                  <img
                    src={chat.listing.photos[0]}
                    alt={chat.listing.title}
                    className="w-12 h-12 rounded-lg object-cover shrink-0 grayscale"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Listing</p>
                  <p className="text-sm font-medium truncate line-through text-gray-400">{chat.listing.title}</p>
                  <p className="text-xs text-red-500 font-medium">No longer available</p>
                </div>
              </div>
            );
          }
          return (
            <Link
              href={`/listings/${chat.listing.id}`}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5 hover:bg-gray-100 transition-colors"
            >
              {chat.listing.photos[0] && (
                <img
                  src={chat.listing.photos[0]}
                  alt={chat.listing.title}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Listing</p>
                <p className="text-sm font-medium truncate">{chat.listing.title}</p>
                <p className="text-xs text-blue-600">${chat.listing.price.toFixed(2)} / day per m³</p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
            </Link>
          );
        })()}
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
