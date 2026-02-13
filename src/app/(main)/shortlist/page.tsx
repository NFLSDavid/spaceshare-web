"use client";
import { useState, useEffect } from "react";
import { ListingCard } from "@/components/listing-card";
import { toast } from "@/components/ui/toast";
import type { ListingWithHost } from "@/types";
import { Heart } from "lucide-react";

export default function ShortlistPage() {
  const [listings, setListings] = useState<ListingWithHost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortlist();
  }, []);

  async function fetchShortlist() {
    try {
      const res = await fetch("/api/shortlist");
      const data = await res.json();
      setListings(data);
    } catch {
      toast("Failed to load shortlist", "error");
    }
    setLoading(false);
  }

  async function removeFromShortlist(listingId: string) {
    try {
      await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, action: "remove" }),
      });
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      toast("Removed from shortlist", "success");
    } catch {
      toast("Failed to remove", "error");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Shortlist</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No shortlisted listings yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onShortlist={() => removeFromShortlist(listing.id)}
              isShortlisted
              showHost
            />
          ))}
        </div>
      )}
    </div>
  );
}
