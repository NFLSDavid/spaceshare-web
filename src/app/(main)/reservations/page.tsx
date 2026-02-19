"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ItemDeclaration } from "@/components/item-declaration";
import type { ReservationWithDetails, ReservationStatus } from "@/types";
import { format } from "date-fns";
import { Calendar, DollarSign, Box, User, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Archive, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  DECLINED: "error",
  CANCELLED: "error",
  COMPLETED: "success",
  CANCEL_REQUESTED: "warning",
};

export default function ReservationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [asHost, setAsHost] = useState(false);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReservationWithDetails | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetchReservations();
  }, [asHost]);

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations?asHost=${asHost}`);
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch {
      toast("Failed to load reservations", "error");
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast(`Reservation ${status.toLowerCase().replace("_", " ")}`, "success");
        setSelected(null);
        fetchReservations();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
  }

  async function rateListing(reservation: ReservationWithDetails, liked: boolean) {
    try {
      const res = await fetch(`/api/listings/${reservation.listingId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id, liked }),
      });
      if (res.ok) {
        toast(liked ? "Thanks for your positive rating!" : "Thanks for your feedback!", "success");
        setSelected(null);
        fetchReservations();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to rate", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
  }

  async function clearReservation(id: string) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleared: true }),
      });
      if (res.ok) {
        toast("Moved to history", "success");
        setSelected(null);
        fetchReservations();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to clear", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
  }

  const filtered = filter === "ALL" ? reservations : reservations.filter((r) => r.status === filter);
  const filters = ["ALL", "PENDING", "APPROVED", "CANCEL_REQUESTED", "DECLINED", "CANCELLED", "COMPLETED"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reservations</h1>

      {/* Host / Client tab */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => { setAsHost(false); setFilter("ALL"); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            !asHost
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          My Reservations
        </button>
        <button
          onClick={() => { setAsHost(true); setFilter("ALL"); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            asHost
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Hosting Requests
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filter === f
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            {f === "ALL" ? "All" : f.replace("_", " ").charAt(0) + f.replace("_", " ").slice(1).toLowerCase()}
            {f !== "ALL" && (
              <span className="ml-1 text-[10px]">
                ({reservations.filter((r) => r.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No reservations found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
              <CardContent className="flex items-center gap-4 py-4">
                {r.listing.photos[0] && (
                  <img src={r.listing.photos[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-medium text-sm truncate ${(r.listing.deletedAt || !r.listing.isActive) ? "line-through text-gray-400" : ""}`}>{r.listing.title}</h3>
                    <Badge variant={STATUS_BADGE[r.status]}>{r.status.replace("_", " ")}</Badge>
                  </div>
                  {(r.listing.deletedAt || !r.listing.isActive) && (
                    <p className="text-xs text-red-500 font-medium">Listing no longer available</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(r.startDate), "MMM d")} - {format(new Date(r.endDate), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {asHost
                      ? `Client: ${r.client.firstName} ${r.client.lastName}`
                      : `Host: ${r.host.firstName} ${r.host.lastName}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">${r.totalCost.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{r.spaceRequested} m³</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Reservation Details"
        className="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selected.listing.photos[0] && (
                <img src={selected.listing.photos[0]} alt="" className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div>
                <h3 className="font-semibold">{selected.listing.title}</h3>
                <Badge variant={STATUS_BADGE[selected.status]}>{selected.status.replace("_", " ")}</Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />{format(new Date(selected.startDate), "MMM d, yyyy")} - {format(new Date(selected.endDate), "MMM d, yyyy")}</div>
              <div className="flex items-center gap-2"><Box className="h-4 w-4 text-gray-400" />{selected.spaceRequested} m³ requested</div>
              <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-400" />Total: ${selected.totalCost.toFixed(2)} CAD</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                {asHost
                  ? `Client: ${selected.client.firstName} ${selected.client.lastName}`
                  : `Host: ${selected.host.firstName} ${selected.host.lastName}`}
              </div>
              {selected.message && <p className="text-gray-600 italic">"{selected.message}"</p>}
            </div>

            {/* Items display */}
            {selected.items && Object.keys(selected.items as Record<string, string>).length > 0 && (
              <div className="border-t pt-3">
                <ItemDeclaration value={selected.items as Record<string, string>} readOnly />
              </div>
            )}

            {/* Rating section */}
            {!asHost && (selected.status === "APPROVED" || selected.status === "COMPLETED") && !selected.rated && new Date(selected.startDate) <= new Date() && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Rate your experience</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => rateListing(selected, true)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1 text-green-600" /> Liked it
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => rateListing(selected, false)}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1 text-red-500" /> Not great
                  </Button>
                </div>
              </div>
            )}
            {selected.rated && (
              <div className="flex items-center gap-1 text-sm text-blue-600 border-t pt-3">
                <CheckCircle className="h-4 w-4" /> You have rated this reservation
              </div>
            )}

            {/* CANCEL_REQUESTED info */}
            {selected.status === "CANCEL_REQUESTED" && (
              <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium">Cancellation requested</p>
                <p className="text-xs mt-1">
                  {selected.cancelRequestedBy === user?.id
                    ? "You requested cancellation. Waiting for the other party to approve."
                    : "The other party requested cancellation. You can approve or reject."}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2 flex-wrap">
              {/* Host actions */}
              {asHost && selected.status === "PENDING" && (
                <>
                  <Button className="flex-1" onClick={() => updateStatus(selected.id, "APPROVED")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "DECLINED")}>
                    <XCircle className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </>
              )}
              {asHost && selected.status === "APPROVED" && (
                <>
                  <Button className="flex-1" onClick={() => updateStatus(selected.id, "COMPLETED")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => updateStatus(selected.id, "CANCEL_REQUESTED")}>
                    <XCircle className="h-4 w-4 mr-1" /> Request Cancel
                  </Button>
                </>
              )}

              {/* Client actions */}
              {!asHost && selected.status === "PENDING" && (
                <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "CANCELLED")}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
              {!asHost && selected.status === "APPROVED" && (
                <Button variant="outline" className="flex-1" onClick={() => updateStatus(selected.id, "CANCEL_REQUESTED")}>
                  <XCircle className="h-4 w-4 mr-1" /> Request Cancel
                </Button>
              )}

              {/* CANCEL_REQUESTED actions (for the other party) */}
              {selected.status === "CANCEL_REQUESTED" && selected.cancelRequestedBy !== user?.id && (
                <>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "CANCELLED")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve Cancel
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => updateStatus(selected.id, "APPROVED")}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject Cancel
                  </Button>
                </>
              )}

              {/* Chat button for active reservations */}
              {(selected.status === "APPROVED" || selected.status === "CANCEL_REQUESTED") && (
                <Button variant="outline" className="flex-1" onClick={() => router.push("/messages")}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Chat
                </Button>
              )}

              {/* Clear to history (terminal states only) */}
              {(selected.status === "CANCELLED" || selected.status === "DECLINED" || selected.status === "COMPLETED") && (
                <Button variant="outline" className="flex-1" onClick={() => clearReservation(selected.id)}>
                  <Archive className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
