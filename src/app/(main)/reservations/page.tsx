"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useModeStore } from "@/stores/mode-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ItemDeclaration } from "@/components/item-declaration";
import type { ReservationWithDetails, ReservationStatus } from "@/types";
import { format, differenceInCalendarDays } from "date-fns";
import { Calendar, DollarSign, Box, User, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, CreditCard } from "lucide-react";

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  DECLINED: "error",
  CANCELLED: "error",
  COMPLETED: "success",
};

const TAX_RATE = 0.13;

export default function ReservationsPage() {
  const { user } = useAuth();
  const { isHostMode } = useModeStore();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReservationWithDetails | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [paymentDialog, setPaymentDialog] = useState<ReservationWithDetails | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [isHostMode]);

  async function fetchReservations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations?asHost=${isHostMode}`);
      const data = await res.json();
      setReservations(data);
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
        toast(`Reservation ${status.toLowerCase()}`, "success");
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

  async function markPaid(id: string) {
    try {
      await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentCompleted: true }),
      });
      toast("Payment marked as completed", "success");
      setPaymentDialog(null);
      setSelected(null);
      fetchReservations();
    } catch {
      toast("Failed to update", "error");
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

  const filtered = filter === "ALL" ? reservations : reservations.filter((r) => r.status === filter);

  const filters = ["ALL", "PENDING", "APPROVED", "DECLINED", "CANCELLED", "COMPLETED"];

  function getPaymentBreakdown(r: ReservationWithDetails) {
    const days = differenceInCalendarDays(new Date(r.endDate), new Date(r.startDate));
    const pricePerDay = r.listing.price;
    const subtotal = pricePerDay * r.spaceRequested * days;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { days, pricePerDay, subtotal, tax, total };
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isHostMode ? "Reservation Requests" : "My Reservations"}
      </h1>

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
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm truncate">{r.listing.title}</h3>
                    <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(r.startDate), "MMM d")} - {format(new Date(r.endDate), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isHostMode
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
                <Badge variant={STATUS_BADGE[selected.status]}>{selected.status}</Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />{format(new Date(selected.startDate), "MMM d, yyyy")} - {format(new Date(selected.endDate), "MMM d, yyyy")}</div>
              <div className="flex items-center gap-2"><Box className="h-4 w-4 text-gray-400" />{selected.spaceRequested} m³ requested</div>
              <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-400" />${selected.totalCost.toFixed(2)} CAD total</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                {isHostMode
                  ? `Client: ${selected.client.firstName} ${selected.client.lastName}`
                  : `Host: ${selected.host.firstName} ${selected.host.lastName}`}
              </div>
              {selected.message && <p className="text-gray-600 italic">"{selected.message}"</p>}
              {selected.paymentCompleted && (
                <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Payment completed</div>
              )}
            </div>

            {/* Items display */}
            {selected.items && Object.keys(selected.items as Record<string, string>).length > 0 && (
              <div className="border-t pt-3">
                <ItemDeclaration value={selected.items as Record<string, string>} readOnly />
              </div>
            )}

            {/* Rating section */}
            {!isHostMode && selected.status === "APPROVED" && !selected.rated && new Date(selected.startDate) <= new Date() && (
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

            <div className="flex gap-2 pt-2">
              {/* Host actions */}
              {isHostMode && selected.status === "PENDING" && (
                <>
                  <Button className="flex-1" onClick={() => updateStatus(selected.id, "APPROVED")}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "DECLINED")}>
                    <XCircle className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </>
              )}
              {isHostMode && selected.status === "APPROVED" && (
                <Button className="flex-1" onClick={() => updateStatus(selected.id, "COMPLETED")}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
                </Button>
              )}

              {/* Client actions */}
              {!isHostMode && selected.status === "APPROVED" && !selected.paymentCompleted && (
                <Button className="flex-1" onClick={() => { setPaymentDialog(selected); }}>
                  <CreditCard className="h-4 w-4 mr-1" /> Pay Now
                </Button>
              )}
              {!isHostMode && (selected.status === "PENDING" || selected.status === "APPROVED") && (
                <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "CANCELLED")}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={!!paymentDialog}
        onClose={() => setPaymentDialog(null)}
        title="Payment Details"
        className="max-w-md"
      >
        {paymentDialog && (() => {
          const { days, pricePerDay, subtotal, tax, total } = getPaymentBreakdown(paymentDialog);
          return (
            <div className="space-y-4">
              <h3 className="font-semibold">{paymentDialog.listing.title}</h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>${pricePerDay.toFixed(2)}/day x {paymentDialog.spaceRequested} m³ x {days} days</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (13%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-800 mb-1">Send e-Transfer to:</p>
                <p className="text-blue-600 font-mono">{paymentDialog.host.email}</p>
                <p className="text-xs text-blue-500 mt-2">
                  Host: {paymentDialog.host.firstName} {paymentDialog.host.lastName}
                </p>
              </div>

              <Button className="w-full" onClick={() => markPaid(paymentDialog.id)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Confirm Payment
              </Button>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
