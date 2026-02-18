"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
  mapId?: string;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLatLng(loc: any): { lat: number; lng: number } | null {
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function GoogleMap({
  center = { lat: 43.4723, lng: -80.5449 },
  zoom = 13,
  markers = [],
  onClick,
  onMarkerClick,
  className,
  showSearch = false,
  mapId = "DEMO_MAP_ID",
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const [loaded, setLoaded] = useState(false);
  const [searchText, setSearchText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current || !ensureOptions()) return;

    (async () => {
      try {
        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
        if (!mapRef.current) return;

        const map = new Map(mapRef.current, {
          center,
          zoom,
          mapId,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        });

        mapInstanceRef.current = map;
        setLoaded(true);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onClickRef.current?.(e.latLng.lat(), e.latLng.lng());
          }
        });
      } catch (err) {
        console.error("[GoogleMap] init failed:", err);
      }
    })();

    return () => {
      markersRef.current.forEach((m) => { m.map = null; });
      markersRef.current = [];
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;

    (async () => {
      const { AdvancedMarkerElement } = (await importLibrary("marker")) as google.maps.MarkerLibrary;

      markersRef.current.forEach((m) => { m.map = null; });
      markersRef.current = [];

      markers.forEach((m) => {
        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position: { lat: m.lat, lng: m.lng },
          title: m.title,
        });

        if (onMarkerClick && m.id) {
          marker.addListener("click", () => onMarkerClick(m.id!));
        }

        markersRef.current.push(marker);
      });
    })();
  }, [markers, loaded, onMarkerClick]);

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center.lat !== 0 && center.lng !== 0) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center.lat, center.lng]);

  // Autocomplete suggestions (debounced, uses Places API New)
  useEffect(() => {
    if (!showSearch || !searchText.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const placesLib = (await importLibrary("places")) as any;
        if (!placesLib.AutocompleteSuggestion) return;
        const result = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: searchText,
        });
        setSuggestions(result.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, showSearch]);

  // Select a suggestion → update map + coordinates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectSuggestion = useCallback(async (suggestion: any) => {
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location"] });
      const coords = getLatLng(place.location);
      if (!coords) return;

      mapInstanceRef.current?.setCenter(coords);
      mapInstanceRef.current?.setZoom(15);
      onClickRef.current?.(coords.lat, coords.lng);
      setSearchText(suggestion.placePrediction.text?.text ?? "");
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      console.error("[GoogleMap] selectSuggestion error:", err);
    }
  }, []);

  // Enter key / Search button → pick first suggestion
  const handleSearch = useCallback(() => {
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0]);
    }
  }, [suggestions, selectSuggestion]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {showSearch && (
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="flex gap-1">
            <input
              type="text"
              value={searchText}
              placeholder="Search for a location..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
                if (e.key === "Escape") { setShowSuggestions(false); }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white shadow-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {suggestions.map((s: any, i: number) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                    onClick={() => selectSuggestion(s)}
                  >
                    {s.placePrediction?.text?.text ?? ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
