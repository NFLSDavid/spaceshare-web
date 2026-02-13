"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ImageCarousel } from "@/components/image-carousel";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { AMENITY_LABELS } from "@/types";
import type { ListingWithHost } from "@/types";
import { Plus, Search, DollarSign, Trash2, Edit, Eye, EyeOff } from "lucide-react";

export default function ListingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingWithHost[]>([]);
  const [filtered, setFiltered] = useState<ListingWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<ListingWithHost | null>(null);
  const [revenue, setRevenue] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) fetchListings();
  }, [user?.id]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(listings);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(listings.filter((l) => l.title.toLowerCase().includes(q)));
    }
  }, [searchQuery, listings]);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings?hostId=${user!.id}`);
      const data = await res.json();
      setListings(data);
      setFiltered(data);
    } catch {
      toast("Failed to load listings", "error");
    }
    setLoading(false);
  }

  async function fetchRevenue(listingId: string) {
    try {
      const res = await fetch(`/api/reservations?listingId=${listingId}&status=COMPLETED`);
      const data = await res.json();
      const total = data.reduce((sum: number, r: any) => sum + r.totalCost, 0);
      setRevenue(Math.round(total * 100) / 100);
    } catch {
      setRevenue(0);
    }
  }

  async function deleteListing(id: string) {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to delete", "error");
        return;
      }
      toast("Listing deleted", "success");
      setSelectedListing(null);
      fetchListings();
    } catch {
      toast("Failed to delete listing", "error");
    }
  }

  async function toggleActive(listing: ListingWithHost) {
    try {
      await fetch(`/api/listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !listing.isActive }),
      });
      toast(listing.isActive ? "Listing deactivated" : "Listing activated", "success");
      fetchListings();
      setSelectedListing(null);
    } catch {
      toast("Failed to update listing", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Button onClick={() => router.push("/listings/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Listing
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No listings yet</p>
          <Button onClick={() => router.push("/listings/new")}>Create your first listing</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => {
                setSelectedListing(listing);
                fetchRevenue(listing.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Listing Detail Dialog */}
      <Dialog
        open={!!selectedListing}
        onClose={() => { setSelectedListing(null); setRevenue(null); }}
        title={selectedListing?.title}
        className="max-w-2xl"
      >
        {selectedListing && (
          <div className="space-y-4">
            <ImageCarousel images={selectedListing.photos} className="aspect-video" />

            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600">
                ${selectedListing.price.toFixed(2)} CAD/day per m³
              </span>
              <Badge variant={selectedListing.isActive ? "success" : "warning"}>
                {selectedListing.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <p className="text-sm text-gray-600">{selectedListing.description}</p>

            <div className="text-sm text-gray-500">
              Space available: {selectedListing.spaceAvailable} m³
            </div>

            {selectedListing.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedListing.amenities.map((a) => (
                  <Badge key={a} variant="info">{AMENITY_LABELS[a]}</Badge>
                ))}
              </div>
            )}

            {revenue !== null && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Total Revenue: ${revenue.toFixed(2)} CAD
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/listings/${selectedListing.id}`)}
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" onClick={() => toggleActive(selectedListing)}>
                {selectedListing.isActive ? (
                  <><EyeOff className="h-4 w-4 mr-1" /> Deactivate</>
                ) : (
                  <><Eye className="h-4 w-4 mr-1" /> Activate</>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteListing(selectedListing.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
