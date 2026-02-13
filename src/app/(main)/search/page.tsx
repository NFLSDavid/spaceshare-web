"use client";
import { useState, useEffect } from "react";
import { useSearchStore } from "@/stores/search-store";
import { useAuth } from "@/hooks/use-auth";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { ImageCarousel } from "@/components/image-carousel";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { ItemDeclaration } from "@/components/item-declaration";
import { GoogleMap } from "@/components/google-map";
import { calculateDistanceKm } from "@/lib/geo";
import { AMENITY_LABELS, SPACE_UPPER_LIMIT, DEFAULT_MAX_PRICE, SPACE_BOOKING_LOWER_LIMIT } from "@/types";
import type { ListingWithHost, Amenity, SortOption } from "@/types";
import {
  Search, SlidersHorizontal, MapPin, Calendar, Box, X,
  Heart, MessageSquare, ArrowUpDown, ThumbsUp, Map, List
} from "lucide-react";

export default function SearchPage() {
  const { user } = useAuth();
  const store = useSearchStore();
  const [listings, setListings] = useState<(ListingWithHost & { _distance?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  const [selectedListing, setSelectedListing] = useState<(ListingWithHost & { _distance?: number }) | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Reservation dialog state
  const [reserveDialog, setReserveDialog] = useState<(ListingWithHost & { _distance?: number }) | null>(null);
  const [reserveForm, setReserveForm] = useState({
    spaceRequested: 1,
    startDate: "",
    endDate: "",
    message: "",
    items: {} as Record<string, string>,
  });
  const [reserving, setReserving] = useState(false);

  // Availability state
  const [availability, setAvailability] = useState<{ date: string; available: number }[] | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Local filter state
  const [localFilter, setLocalFilter] = useState({
    minPrice: 0,
    maxPrice: DEFAULT_MAX_PRICE,
    minSpace: 0,
    maxSpace: SPACE_UPPER_LIMIT,
    amenities: [] as Amenity[],
  });
  const [sortBy, setSortBy] = useState<SortOption>("CLOSEST");

  useEffect(() => {
    fetchShortlist();
  }, []);

  async function fetchShortlist() {
    try {
      const res = await fetch("/api/shortlist");
      const data = await res.json();
      if (Array.isArray(data)) {
        setShortlistedIds(data.map((l: any) => l.id));
      }
    } catch {}
  }

  async function handleSearch() {
    if (!store.startDate || !store.endDate) {
      toast("Please select dates", "error");
      return;
    }
    setLoading(true);
    setShowSearch(false);

    try {
      const params = new URLSearchParams();
      if (store.latitude && store.longitude) {
        params.set("lat", store.latitude.toString());
        params.set("lng", store.longitude.toString());
        params.set("radius", store.radius.toString());
      }
      params.set("startDate", store.startDate);
      params.set("endDate", store.endDate);
      params.set("spaceRequired", store.spaceRequired.toString());

      const res = await fetch(`/api/listings?${params}`);
      let data = await res.json();

      // Calculate distances
      if (store.latitude && store.longitude) {
        data = data.map((l: any) => ({
          ...l,
          _distance: calculateDistanceKm(store.latitude, store.longitude, l.latitude, l.longitude),
        }));
      }

      setListings(data);
    } catch {
      toast("Search failed", "error");
    }
    setLoading(false);
  }

  // Apply filters and sort
  const filteredListings = listings
    .filter((l) => {
      if (l.price < localFilter.minPrice || l.price > localFilter.maxPrice) return false;
      if (l.spaceAvailable < localFilter.minSpace || l.spaceAvailable > localFilter.maxSpace) return false;
      if (localFilter.amenities.length > 0) {
        if (!localFilter.amenities.every((a) => l.amenities.includes(a))) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "CLOSEST": return (a._distance || 0) - (b._distance || 0);
        case "NEWEST": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "OLDEST": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "CHEAPEST": return a.price - b.price;
        case "MOST_EXPENSIVE": return b.price - a.price;
        case "LARGEST": return b.spaceAvailable - a.spaceAvailable;
        case "SMALLEST": return a.spaceAvailable - b.spaceAvailable;
        case "MOST_LIKED": return (b.likes || 0) - (a.likes || 0);
        default: return 0;
      }
    });

  async function toggleShortlist(listingId: string) {
    try {
      await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, action: "toggle" }),
      });
      setShortlistedIds((prev) =>
        prev.includes(listingId)
          ? prev.filter((id) => id !== listingId)
          : [...prev, listingId]
      );
    } catch {}
  }

  async function createChat(listing: ListingWithHost) {
    try {
      const res = await fetch("/api/messages/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${listing.host.firstName} - ${listing.title}`,
          photoUrl: listing.photos[0] || null,
          listingId: listing.id,
          memberIds: [user!.id, listing.host.id],
        }),
      });
      const chat = await res.json();
      window.location.href = `/messages/${chat.id}`;
    } catch {
      toast("Failed to create chat", "error");
    }
  }

  function openReserveDialog(listing: ListingWithHost & { _distance?: number }) {
    setSelectedListing(null);
    setReserveForm({
      spaceRequested: 1,
      startDate: store.startDate,
      endDate: store.endDate,
      message: "",
      items: {},
    });
    setAvailability(null);
    setReserveDialog(listing);
    // Fetch availability if dates set
    if (store.startDate && store.endDate) {
      fetchAvailability(listing.id, store.startDate, store.endDate);
    }
  }

  async function fetchAvailability(listingId: string, startDate: string, endDate: string) {
    setLoadingAvailability(true);
    try {
      const res = await fetch(
        `/api/listings/${listingId}/availability?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setAvailability(data);
    } catch {}
    setLoadingAvailability(false);
  }

  async function submitReservation() {
    if (!reserveDialog) return;
    if (!reserveForm.startDate || !reserveForm.endDate) {
      toast("Please select dates", "error");
      return;
    }
    setReserving(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: reserveDialog.id,
          spaceRequested: reserveForm.spaceRequested,
          startDate: reserveForm.startDate,
          endDate: reserveForm.endDate,
          message: reserveForm.message || undefined,
          items: Object.keys(reserveForm.items).length > 0 ? reserveForm.items : undefined,
        }),
      });

      if (res.ok) {
        toast("Reservation request sent!", "success");
        setReserveDialog(null);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to create reservation", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
    setReserving(false);
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "CLOSEST", label: "Closest" },
    { value: "NEWEST", label: "Newest" },
    { value: "OLDEST", label: "Oldest" },
    { value: "CHEAPEST", label: "Cheapest" },
    { value: "MOST_EXPENSIVE", label: "Most Expensive" },
    { value: "LARGEST", label: "Largest" },
    { value: "SMALLEST", label: "Smallest" },
    { value: "MOST_LIKED", label: "Most Liked" },
  ];

  const minAvailable = availability
    ? Math.min(...availability.map((a) => a.available))
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Find Storage</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
            <Search className="h-4 w-4 mr-1" /> Search
          </Button>
          {listings.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowFilter(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1" /> Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              >
                {viewMode === "list" ? <Map className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
                {viewMode === "list" ? "Map" : "List"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search Form */}
      {showSearch && (
        <div className="mb-6 p-4 bg-white rounded-xl border shadow-sm space-y-4">
          <GoogleMap
            center={
              store.latitude && store.longitude
                ? { lat: store.latitude, lng: store.longitude }
                : undefined
            }
            zoom={13}
            onClick={(lat, lng) => store.setLocation(lat, lng)}
            showSearch
            className="h-48 mb-2"
            markers={
              store.latitude && store.longitude
                ? [{ lat: store.latitude, lng: store.longitude, title: "Search center" }]
                : []
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={store.latitude || ""}
              onChange={(e) => store.setLocation(parseFloat(e.target.value) || 0, store.longitude)}
              placeholder="43.4723"
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={store.longitude || ""}
              onChange={(e) => store.setLocation(store.latitude, parseFloat(e.target.value) || 0)}
              placeholder="-80.5449"
            />
          </div>
          <Input
            label={`Search Radius: ${store.radius} km`}
            type="range"
            min="1"
            max="50"
            value={store.radius}
            onChange={(e) => store.setRadius(parseInt(e.target.value))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={store.startDate}
              onChange={(e) => store.setDateRange(e.target.value, store.endDate)}
            />
            <Input
              label="End Date"
              type="date"
              value={store.endDate}
              onChange={(e) => store.setDateRange(store.startDate, e.target.value)}
            />
          </div>
          <Input
            label={`Space Required: ${store.spaceRequired} m³`}
            type="range"
            min="0.5"
            max="100"
            step="0.5"
            value={store.spaceRequired}
            onChange={(e) => store.setSpaceRequired(parseFloat(e.target.value))}
          />
          <Button className="w-full" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      )}

      {/* Sort bar */}
      {listings.length > 0 && !showSearch && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${
                sortBy === opt.value
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Searching...</div>
      ) : !showSearch && filteredListings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No listings found. Try a different search.</div>
      ) : !showSearch && viewMode === "map" ? (
        <GoogleMap
          center={
            store.latitude && store.longitude
              ? { lat: store.latitude, lng: store.longitude }
              : undefined
          }
          zoom={12}
          markers={filteredListings.map((l) => ({
            lat: l.latitude,
            lng: l.longitude,
            title: `${l.title} - $${l.price.toFixed(2)}/day`,
            id: l.id,
          }))}
          onMarkerClick={(id) => {
            const listing = filteredListings.find((l) => l.id === id);
            if (listing) setSelectedListing(listing);
          }}
          className="h-[60vh] rounded-xl"
        />
      ) : !showSearch ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => setSelectedListing(listing)}
              onShortlist={() => toggleShortlist(listing.id)}
              isShortlisted={shortlistedIds.includes(listing.id)}
              showHost
              distance={listing._distance}
            />
          ))}
        </div>
      ) : null}

      {/* Filter Dialog */}
      <Dialog open={showFilter} onClose={() => setShowFilter(false)} title="Filter Results">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Price Range (CAD/day)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input type="number" placeholder="Min" value={localFilter.minPrice || ""} onChange={(e) => setLocalFilter({ ...localFilter, minPrice: parseFloat(e.target.value) || 0 })} />
              <Input type="number" placeholder="Max" value={localFilter.maxPrice || ""} onChange={(e) => setLocalFilter({ ...localFilter, maxPrice: parseFloat(e.target.value) || DEFAULT_MAX_PRICE })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Space Range (m³)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input type="number" placeholder="Min" value={localFilter.minSpace || ""} onChange={(e) => setLocalFilter({ ...localFilter, minSpace: parseFloat(e.target.value) || 0 })} />
              <Input type="number" placeholder="Max" value={localFilter.maxSpace || ""} onChange={(e) => setLocalFilter({ ...localFilter, maxSpace: parseFloat(e.target.value) || SPACE_UPPER_LIMIT })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.entries(AMENITY_LABELS) as [Amenity, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLocalFilter((f) => ({
                    ...f,
                    amenities: f.amenities.includes(key) ? f.amenities.filter((a) => a !== key) : [...f.amenities, key],
                  }))}
                  className={`px-3 py-1 rounded-full text-xs border ${localFilter.amenities.includes(key) ? "bg-blue-100 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => setShowFilter(false)}>Apply Filters</Button>
        </div>
      </Dialog>

      {/* Listing Detail Dialog */}
      <Dialog
        open={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        title={selectedListing?.title}
        className="max-w-2xl"
      >
        {selectedListing && (
          <div className="space-y-4">
            <ImageCarousel images={selectedListing.photos} className="aspect-video" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-blue-600">${selectedListing.price.toFixed(2)} CAD/day per m³</span>
                {selectedListing.likes > 0 && (
                  <span className="flex items-center gap-1 text-sm text-blue-600">
                    <ThumbsUp className="h-4 w-4" /> {selectedListing.likes}
                  </span>
                )}
              </div>
              {selectedListing._distance !== undefined && (
                <span className="text-sm text-gray-500">{selectedListing._distance.toFixed(1)} km away</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{selectedListing.description}</p>
            <p className="text-sm text-gray-500">{selectedListing.spaceAvailable} m³ available</p>
            {selectedListing.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedListing.amenities.map((a) => (
                  <Badge key={a} variant="info">{AMENITY_LABELS[a as Amenity]}</Badge>
                ))}
              </div>
            )}

            {/* Mini map */}
            <GoogleMap
              center={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
              zoom={14}
              markers={[{ lat: selectedListing.latitude, lng: selectedListing.longitude, title: selectedListing.title }]}
              className="h-40"
            />

            {/* Availability display */}
            {minAvailable !== null && selectedListing.id === reserveDialog?.id && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800">
                  Min. available space in selected dates: {minAvailable} m³
                </p>
              </div>
            )}

            <p className="text-sm text-gray-400">
              Host: {selectedListing.host.firstName} {selectedListing.host.lastName}
            </p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => openReserveDialog(selectedListing)}>
                <Calendar className="h-4 w-4 mr-1" /> Reserve
              </Button>
              <Button variant="outline" onClick={() => createChat(selectedListing)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleShortlist(selectedListing.id)}
              >
                <Heart className={`h-4 w-4 ${shortlistedIds.includes(selectedListing.id) ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Reservation Dialog */}
      <Dialog
        open={!!reserveDialog}
        onClose={() => setReserveDialog(null)}
        title={`Reserve: ${reserveDialog?.title || ""}`}
        className="max-w-lg"
      >
        {reserveDialog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={reserveForm.startDate}
                onChange={(e) => {
                  setReserveForm({ ...reserveForm, startDate: e.target.value });
                  if (e.target.value && reserveForm.endDate) {
                    fetchAvailability(reserveDialog.id, e.target.value, reserveForm.endDate);
                  }
                }}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={reserveForm.endDate}
                onChange={(e) => {
                  setReserveForm({ ...reserveForm, endDate: e.target.value });
                  if (reserveForm.startDate && e.target.value) {
                    fetchAvailability(reserveDialog.id, reserveForm.startDate, e.target.value);
                  }
                }}
                required
              />
            </div>

            {/* Availability */}
            {loadingAvailability && (
              <p className="text-xs text-gray-500">Checking availability...</p>
            )}
            {minAvailable !== null && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-blue-800">
                  Min. available space in date range: <strong>{minAvailable} m³</strong>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Space: {reserveForm.spaceRequested} m³
              </label>
              <input
                type="range"
                min={SPACE_BOOKING_LOWER_LIMIT || 0.5}
                max={reserveDialog.spaceAvailable}
                step="0.5"
                value={reserveForm.spaceRequested}
                onChange={(e) => setReserveForm({ ...reserveForm, spaceRequested: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <Textarea
              label="Message (optional)"
              value={reserveForm.message}
              onChange={(e) => setReserveForm({ ...reserveForm, message: e.target.value })}
              placeholder="Any special requirements..."
            />

            <ItemDeclaration
              value={reserveForm.items}
              onChange={(items) => setReserveForm({ ...reserveForm, items })}
            />

            {reserveForm.startDate && reserveForm.endDate && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">
                  Estimated cost: $
                  {(
                    reserveDialog.price *
                    reserveForm.spaceRequested *
                    Math.ceil(
                      (new Date(reserveForm.endDate).getTime() - new Date(reserveForm.startDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  ).toFixed(2)}{" "}
                  CAD
                </p>
              </div>
            )}

            <Button className="w-full" onClick={submitReservation} disabled={reserving}>
              {reserving ? "Submitting..." : "Submit Reservation Request"}
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
