"use client";
import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { cn } from "@/lib/cn";

interface MarkerData {
  lat: number;
  lng: number;
  title?: string;
  id?: string;
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerData[];
  onClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
  showSearch?: boolean;
}

let optionsSet = false;

function ensureOptions() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return false;
  if (!optionsSet) {
    setOptions({ key: apiKey, v: "weekly" });
    optionsSet = true;
  }
  return true;
}

export function GoogleMap({
  center = { lat: 43.4723, lng: -80.5449 },
  zoom = 13,
  markers = [],
  onClick,
  onMarkerClick,
  className,
  showSearch = false,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !ensureOptions()) return;

    (async () => {
      try {
        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
        if (!mapRef.current) return;

        const map = new Map(mapRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        mapInstanceRef.current = map;
        setLoaded(true);

        if (onClick) {
          map.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onClick(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        // Setup Places Autocomplete if search enabled
        if (showSearch && searchInputRef.current) {
          const { Autocomplete } = (await importLibrary("places")) as google.maps.PlacesLibrary;
          const autocomplete = new Autocomplete(searchInputRef.current, {
            fields: ["geometry", "name"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              map.setCenter({ lat, lng });
              map.setZoom(15);
              if (onClick) onClick(lat, lng);
            }
          });
        }
      } catch {
        // API key not configured or failed to load
      }
    })();

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markers.forEach((m) => {
      const marker = new google.maps.Marker({
        map: mapInstanceRef.current!,
        position: { lat: m.lat, lng: m.lng },
        title: m.title,
      });

      if (onMarkerClick && m.id) {
        marker.addListener("click", () => onMarkerClick(m.id!));
      }

      markersRef.current.push(marker);
    });
  }, [markers, loaded, onMarkerClick]);

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center.lat !== 0 && center.lng !== 0) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center.lat, center.lng]);

  return (
    <div className={cn("relative", className)}>
      {showSearch && (
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location..."
          className="absolute top-2 left-2 right-2 z-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">Google Maps API key not configured</p>
        </div>
      )}
    </div>
  );
}
