"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";

interface ChatPreview {
  id: string;
  title: string;
  photoUrl: string | null;
  createdAt: string;
  members: { userId: string; user: { id: string; firstName: string; lastName: string; photoUrl: string | null } }[];
  messages: { text: string | null; senderName: string; imageUrl: string | null; createdAt: string }[];
}

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  async function fetchChats() {
    try {
      const res = await fetch("/api/messages/chats");
      const data = await res.json();
      setChats(data);
    } catch {
      toast("Failed to load messages", "error");
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : chats.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const lastMsg = chat.messages[0];
            const otherMember = chat.members.find((m) => m.userId !== user?.id)?.user;

            return (
              <Card
                key={chat.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/messages/${chat.id}`)}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {chat.photoUrl ? (
                      <img src={chat.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">{chat.title}</h3>
                      {lastMsg && (
                        <span className="text-xs text-gray-400 shrink-0 ml-2">
                          {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {lastMsg
                        ? lastMsg.imageUrl
                          ? `${lastMsg.senderName} sent an image`
                          : `${lastMsg.senderName}: ${lastMsg.text}`
                        : "No messages yet"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
