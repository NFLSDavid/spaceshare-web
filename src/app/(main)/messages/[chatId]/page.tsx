"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useChatStream } from "@/hooks/use-chat-stream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ItemDeclaration } from "@/components/item-declaration";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import { SPACE_BOOKING_LOWER_LIMIT } from "@/types";
import type { ProposalData } from "@/types";
import {
  Send, ArrowLeft, Image as ImageIcon, ExternalLink, Trash2,
  FileText, Ban, CheckCircle, XCircle,
} from "lucide-react";
import Link from "next/link";

interface MessageData {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  proposalData: ProposalData | null;
  createdAt: string;
}

interface ListingSnippet {
  id: string;
  title: string;
  price: number;
  photos: string[];
  isActive: boolean;
  deletedAt: string | null;
  spaceAvailable: number;
  hostId: string;
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

  // Proposal dialog state
  const [showProposal, setShowProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    spaceRequested: 1,
    totalCost: 0,
    startDate: "",
    endDate: "",
    message: "",
    items: {} as Record<string, string>,
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

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
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message as MessageData];
    });
  });

  const isHost = chat?.listing?.hostId === user?.id;
  const isClient = !isHost && chat?.listing != null;

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

  async function blockUser() {
    if (!chat) return;
    const other = chat.members.find((m) => m.userId !== user?.id);
    if (!other) return;
    if (!confirm(`Block ${other.user.firstName}? Their listings will be hidden from your search. This cannot be undone.`)) return;
    try {
      await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: other.userId }),
      });
      toast("User blocked", "success");
      router.push("/messages");
    } catch {
      toast("Failed to block user", "error");
    }
  }

  function computeEstimatedCost(space: number, startDate: string, endDate: string): number {
    if (!startDate || !endDate || !chat?.listing) return 0;
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.round(chat.listing.price * space * days * 100) / 100;
  }

  function openProposalDialog() {
    setProposalForm({
      spaceRequested: 1,
      totalCost: 0,
      startDate: "",
      endDate: "",
      message: "",
      items: {},
    });
    setShowProposal(true);
  }

  async function submitProposal() {
    if (!proposalForm.startDate || !proposalForm.endDate) {
      toast("Please select dates", "error");
      return;
    }
    setSubmittingProposal(true);
    try {
      const res = await fetch(`/api/messages/chats/${chatId}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalCost: proposalForm.totalCost,
          spaceRequested: proposalForm.spaceRequested,
          startDate: proposalForm.startDate,
          endDate: proposalForm.endDate,
          message: proposalForm.message || undefined,
          items: Object.keys(proposalForm.items).length > 0 ? proposalForm.items : undefined,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        messagesSentInSession.current = true;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setShowProposal(false);
        toast("Proposal sent!", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to send proposal", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
    setSubmittingProposal(false);
  }

  async function respondToProposal(messageId: string, action: "accept" | "reject") {
    setRespondingTo(messageId);
    try {
      const res = await fetch(`/api/messages/chats/${chatId}/proposal/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast(action === "accept" ? "Proposal accepted! Reservation created." : "Proposal rejected.", "success");
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === messageId && m.proposalData) {
              return { ...m, proposalData: { ...m.proposalData, status: action === "accept" ? "accepted" : "rejected" } };
            }
            return m;
          })
        );
      } else {
        const data = await res.json();
        toast(data.error || "Failed to respond", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
    setRespondingTo(null);
  }

  function renderProposalCard(msg: MessageData) {
    const p = msg.proposalData!;
    const statusColors = {
      pending: "border-blue-200 bg-blue-50",
      accepted: "border-green-200 bg-green-50",
      rejected: "border-gray-200 bg-gray-50",
    };
    const statusBadge = {
      pending: "info" as const,
      accepted: "success" as const,
      rejected: "error" as const,
    };

    return (
      <div className={cn("rounded-xl border-2 p-4 space-y-2 max-w-[85%]", statusColors[p.status])}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold">Final Decision</span>
          <Badge variant={statusBadge[p.status]}>
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-500">Dates</span>
          <span>{format(new Date(p.startDate), "MMM d")} - {format(new Date(p.endDate), "MMM d, yyyy")}</span>
          <span className="text-gray-500">Space</span>
          <span>{p.spaceRequested} m³</span>
          <span className="text-gray-500">Total Cost</span>
          <span className="font-semibold">${p.totalCost.toFixed(2)} CAD</span>
        </div>
        {p.items && Object.keys(p.items).length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">Items: </span>
            {Object.entries(p.items).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </div>
        )}
        {p.message && <p className="text-xs text-gray-600 italic">"{p.message}"</p>}

        {/* Host can accept/reject pending proposals */}
        {p.status === "pending" && isHost && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => respondToProposal(msg.id, "accept")}
              disabled={respondingTo === msg.id}
            >
              <CheckCircle className="h-3 w-3 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => respondToProposal(msg.id, "reject")}
              disabled={respondingTo === msg.id}
            >
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </div>
        )}

        <p className={cn("text-[10px]", msg.senderId === user?.id ? "text-blue-400" : "text-gray-400")}>
          {msg.senderName} &middot; {format(new Date(msg.createdAt), "MMM d, h:mm a")}
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

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
            onClick={blockUser}
            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Block user"
          >
            <Ban className="h-4 w-4" />
          </button>
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
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
              <Link
                href={`/listings/${chat.listing.id}`}
                className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
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
              {isClient && (
                <button
                  onClick={openProposalDialog}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Send Proposal
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;

          // Render proposal cards differently
          if (msg.proposalData) {
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                {renderProposalCard(msg)}
              </div>
            );
          }

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

      {/* Proposal Dialog */}
      <Dialog
        open={showProposal}
        onClose={() => setShowProposal(false)}
        title="Send Final Decision"
        className="max-w-lg"
      >
        {chat?.listing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                min={today}
                value={proposalForm.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  const estimated = computeEstimatedCost(proposalForm.spaceRequested, startDate, proposalForm.endDate);
                  setProposalForm({ ...proposalForm, startDate, totalCost: estimated });
                }}
                required
              />
              <Input
                label="End Date"
                type="date"
                min={proposalForm.startDate || today}
                value={proposalForm.endDate}
                onChange={(e) => {
                  const endDate = e.target.value;
                  const estimated = computeEstimatedCost(proposalForm.spaceRequested, proposalForm.startDate, endDate);
                  setProposalForm({ ...proposalForm, endDate, totalCost: estimated });
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Space: {proposalForm.spaceRequested} m³
              </label>
              <input
                type="range"
                min={SPACE_BOOKING_LOWER_LIMIT || 0.5}
                max={chat.listing.spaceAvailable}
                step="0.5"
                value={proposalForm.spaceRequested}
                onChange={(e) => {
                  const space = parseFloat(e.target.value);
                  const estimated = computeEstimatedCost(space, proposalForm.startDate, proposalForm.endDate);
                  setProposalForm({ ...proposalForm, spaceRequested: space, totalCost: estimated });
                }}
                className="w-full"
              />
            </div>

            <Textarea
              label="Message (optional)"
              value={proposalForm.message}
              onChange={(e) => setProposalForm({ ...proposalForm, message: e.target.value })}
              placeholder="Any special requirements..."
            />

            <ItemDeclaration
              value={proposalForm.items}
              onChange={(items) => setProposalForm({ ...proposalForm, items })}
            />

            {proposalForm.startDate && proposalForm.endDate && (() => {
              const estimated = computeEstimatedCost(proposalForm.spaceRequested, proposalForm.startDate, proposalForm.endDate);
              return (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-3">
                  <p className="text-gray-600">
                    Listed price: <strong>${estimated.toFixed(2)} CAD</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (CAD)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={proposalForm.totalCost || ""}
                      onChange={(e) => setProposalForm({ ...proposalForm, totalCost: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {proposalForm.totalCost > 0 && proposalForm.totalCost !== estimated && (
                      <p className={`text-xs mt-1 ${proposalForm.totalCost < estimated ? "text-orange-600" : "text-green-600"}`}>
                        {proposalForm.totalCost < estimated
                          ? `$${(estimated - proposalForm.totalCost).toFixed(2)} below listed price`
                          : `$${(proposalForm.totalCost - estimated).toFixed(2)} above listed price`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <Button className="w-full" onClick={submitProposal} disabled={submittingProposal}>
              {submittingProposal ? "Sending..." : "Send Proposal"}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
