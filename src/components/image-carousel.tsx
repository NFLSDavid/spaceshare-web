"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

export function ImageCarousel({ images, className }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const photos = images.length > 0 ? images : ["/placeholder.svg"];

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-gray-100", className)}>
      <img
        src={photos[current]}
        alt={`Image ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + photos.length) % photos.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % photos.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 hover:bg-white shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === current ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
