"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import type { ReservationWithDetails } from "@/types";
import { format } from "date-fns";
import { Trash2, History } from "lucide-react";

interface DeletedListing {
  id: string;
  title: string;
  price: number;
  spaceAvailable: number;
  photos: string[];
  deletedAt: string | null;
}

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  DECLINED: "error",
  CANCELLED: "error",
  COMPLETED: "success",
  CANCEL_REQUESTED: "warning",
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"reservations" | "listings">("reservations");
  const [asHost, setAsHost] = useState(false);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [listings, setListings] = useState<DeletedListing[]>([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetchClearedReservations();
  }, [asHost]);

  useEffect(() => {
    if (activeTab === "listings") fetchDeletedListings();
  }, [activeTab]);

  async function fetchClearedReservations() {
    setLoadingRes(true);
    try {
      const res = await fetch(`/api/reservations?asHost=${asHost}&cleared=true`);
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch {
      toast("Failed to load history", "error");
    }
    setLoadingRes(false);
  }

  async function fetchDeletedListings() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/listings?deleted=true");
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      toast("Failed to load deleted listings", "error");
    }
    setLoadingList(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">History</h1>

      {/* Top-level tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("reservations")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "reservations"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Reservations
        </button>
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "listings"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Deleted Listings
        </button>
      </div>

      {activeTab === "reservations" && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setAsHost(false)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                !asHost
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Reservations
            </button>
            <button
              onClick={() => setAsHost(true)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                asHost
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Hosting Requests
            </button>
          </div>

          {loadingRes ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No cleared reservations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((r) => (
                <Card key={r.id} className="opacity-75">
                  <CardContent className="flex items-center gap-4 py-4">
                    {r.listing.photos[0] && (
                      <img src={r.listing.photos[0]} alt="" className="w-16 h-16 rounded-lg object-cover grayscale" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm truncate text-gray-500">{r.listing.title}</h3>
                        <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(r.startDate), "MMM d")} - {format(new Date(r.endDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {asHost
                          ? `Client: ${r.client.firstName} ${r.client.lastName}`
                          : `Host: ${r.host.firstName} ${r.host.lastName}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-500">${r.totalCost.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{r.spaceRequested} m³</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "listings" && (
        <>
          {loadingList ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No deleted listings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <Card key={listing.id} className="opacity-75">
                  <CardContent className="flex items-center gap-4 py-4">
                    {listing.photos[0] && (
                      <img src={listing.photos[0]} alt="" className="w-16 h-16 rounded-lg object-cover grayscale" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm truncate text-gray-400 line-through">{listing.title}</h3>
                        <Badge variant="error">Deleted</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        ${listing.price.toFixed(2)} / day per m³ &middot; {listing.spaceAvailable} m³
                      </p>
                      {listing.deletedAt && (
                        <p className="text-xs text-red-400 mt-0.5">
                          <Trash2 className="inline h-3 w-3 mr-1" />
                          Deleted {format(new Date(listing.deletedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
