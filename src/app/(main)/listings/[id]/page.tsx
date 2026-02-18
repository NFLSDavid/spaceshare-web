"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ImageCarousel } from "@/components/image-carousel";
import { GoogleMap } from "@/components/google-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { AMENITY_LABELS } from "@/types";
import type { ListingWithHost, Amenity } from "@/types";
import { ArrowLeft, MapPin, Box, Edit, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingWithHost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((data) => { setListing(data); setLoading(false); })
      .catch(() => { toast("Failed to load listing", "error"); setLoading(false); });
  }, [id]);

  async function handleContactHost() {
    if (!user) { router.push("/login"); return; }
    if (!listing) return;

    try {
      const res = await fetch("/api/messages/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          memberIds: [user.id, listing.hostId],
          title: listing.title,
          photoUrl: listing.photos[0] ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Failed to start chat", "error"); return; }
      router.push(`/messages/${data.id}`);
    } catch {
      toast("Failed to start chat", "error");
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!listing) return <div className="text-center py-20 text-gray-500">Listing not found</div>;

  const isOwner = user?.id === listing.hostId;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Photos */}
      <ImageCarousel images={listing.photos} className="aspect-video rounded-xl overflow-hidden" />

      {/* Title & Price */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          {listing.host && (
            <p className="text-sm text-gray-500 mt-1">
              by {listing.host.firstName} {listing.host.lastName}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-blue-600">${listing.price.toFixed(2)}</p>
          <p className="text-xs text-gray-400">CAD / day per m³</p>
        </div>
      </div>

      {/* Status + Space */}
      <div className="flex items-center gap-3">
        <Badge variant={listing.isActive ? "success" : "warning"}>
          {listing.isActive ? "Available" : "Unavailable"}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Box className="h-4 w-4" />
          {listing.spaceAvailable} m³ available
        </span>
      </div>

      {/* Description */}
      <div>
        <h2 className="font-semibold mb-2">Description</h2>
        <p className="text-sm text-gray-600 whitespace-pre-line">{listing.description}</p>
      </div>

      {/* Amenities */}
      {listing.amenities.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {(listing.amenities as Amenity[]).map((a) => (
              <Badge key={a} variant="info">{AMENITY_LABELS[a]}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      {(listing.availableFrom || listing.availableTo) && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span className="font-medium">Available:</span>
          {listing.availableFrom
            ? new Date(listing.availableFrom).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
            : "Any time"}
          {" → "}
          {listing.availableTo
            ? new Date(listing.availableTo).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
            : "Open-ended"}
        </div>
      )}

      {/* Map */}
      {listing.latitude !== 0 && listing.longitude !== 0 && (
        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4" /> Location
          </h2>
          <GoogleMap
            center={{ lat: listing.latitude, lng: listing.longitude }}
            zoom={14}
            markers={[{ lat: listing.latitude, lng: listing.longitude, title: listing.title }]}
            className="h-52 rounded-xl overflow-hidden"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {isOwner ? (
          <Link href={`/listings/${id}/edit`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Edit className="h-4 w-4 mr-2" /> Edit Listing
            </Button>
          </Link>
        ) : (
          <Button onClick={handleContactHost} className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" /> Contact Host
          </Button>
        )}
      </div>
    </div>
  );
}
