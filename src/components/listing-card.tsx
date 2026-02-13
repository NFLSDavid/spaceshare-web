"use client";
import Image from "next/image";
import { Heart, MapPin, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { AMENITY_LABELS } from "@/types";
import type { ListingWithHost } from "@/types";
import { useState } from "react";

interface ListingCardProps {
  listing: ListingWithHost;
  onClick?: () => void;
  onShortlist?: () => void;
  isShortlisted?: boolean;
  showHost?: boolean;
  distance?: number;
}

export function ListingCard({
  listing,
  onClick,
  onShortlist,
  isShortlisted = false,
  showHost = false,
  distance,
}: ListingCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const photos = listing.photos.length > 0 ? listing.photos : ["/placeholder.svg"];

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <img
          src={photos[imgIndex]}
          alt={listing.title}
          className="w-full h-full object-cover"
        />

        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === imgIndex ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {onShortlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onShortlist(); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
          >
            <Heart
              className={cn("h-4 w-4", isShortlisted ? "fill-red-500 text-red-500" : "text-gray-600")}
            />
          </button>
        )}

        {!listing.isActive && (
          <Badge variant="warning" className="absolute top-2 left-2">Inactive</Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-sm line-clamp-1">{listing.title}</h3>
          <span className="text-sm font-bold text-blue-600 whitespace-nowrap ml-2">
            ${listing.price.toFixed(2)}/day
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {distance !== undefined ? `${distance.toFixed(1)} km away` : "View on map"}
          </span>
          {listing.likes > 0 && (
            <span className="flex items-center gap-0.5 text-blue-600">
              <ThumbsUp className="h-3 w-3" />
              {listing.likes}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {listing.spaceAvailable} m³ available
        </p>

        {listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.amenities.slice(0, 3).map((a) => (
              <Badge key={a} variant="info" className="text-[10px]">
                {AMENITY_LABELS[a]}
              </Badge>
            ))}
            {listing.amenities.length > 3 && (
              <Badge variant="default" className="text-[10px]">
                +{listing.amenities.length - 3}
              </Badge>
            )}
          </div>
        )}

        {showHost && listing.host && (
          <p className="text-xs text-gray-400">
            by {listing.host.firstName} {listing.host.lastName}
          </p>
        )}
      </div>
    </Card>
  );
}
