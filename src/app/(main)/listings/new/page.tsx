"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { GoogleMap } from "@/components/google-map";
import { AMENITY_LABELS, SPACE_OFFERING_LOWER_LIMIT, SPACE_UPPER_LIMIT } from "@/types";
import type { Amenity } from "@/types";
import { Upload, X, Minus, Plus, MapPin, Lightbulb } from "lucide-react";

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    spaceAvailable: 1,
    amenities: [] as Amenity[],
    latitude: 0,
    longitude: 0,
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [priceRec, setPriceRec] = useState<{ recommendedPrice: number; count: number } | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "spaceshare/listings");

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          setPhotos((prev) => [...prev, data.url]);
        }
      }
    } catch {
      toast("Failed to upload image", "error");
    }
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity: Amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const adjustSpace = (delta: number) => {
    setForm((prev) => ({
      ...prev,
      spaceAvailable: Math.min(
        SPACE_UPPER_LIMIT,
        Math.max(SPACE_OFFERING_LOWER_LIMIT, prev.spaceAvailable + delta)
      ),
    }));
  };

  async function fetchPriceRecommendation(lat: number, lng: number) {
    if (!lat || !lng) return;
    setLoadingPrice(true);
    try {
      const res = await fetch(`/api/listings/price-recommendation?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      setPriceRec(data);
    } catch {}
    setLoadingPrice(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (photos.length === 0) {
      toast("Please add at least one photo", "error");
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast("Please set a location on the map", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photos }),
      });

      if (res.ok) {
        toast("Listing created successfully!", "success");
        router.push("/listings");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to create listing", "error");
      }
    } catch {
      toast("An error occurred", "error");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <Card>
          <CardHeader><h2 className="font-semibold">Photos</h2></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">
                  {uploading ? "Uploading..." : "Add Photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><h2 className="font-semibold">Details</h2></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Spacious Garage Storage"
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your storage space..."
              required
            />
            <div>
              <Input
                label="Price (CAD/day per m³)"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                required
              />
              {form.latitude !== 0 && form.longitude !== 0 && (
                <div className="mt-2">
                  {priceRec && priceRec.count > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="text-gray-600">
                        Suggested: ${priceRec.recommendedPrice.toFixed(2)} (based on {priceRec.count} nearby listings)
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, price: priceRec.recommendedPrice.toFixed(2) })}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  ) : priceRec && priceRec.count === 0 ? (
                    <p className="text-xs text-gray-500 mt-1">No nearby listings to compare</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchPriceRecommendation(form.latitude, form.longitude)}
                      className="text-sm text-blue-600 hover:underline"
                      disabled={loadingPrice}
                    >
                      {loadingPrice ? "Loading..." : "Suggest Price"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Space Available: {form.spaceAvailable} m³
              </label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => adjustSpace(-0.5)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all"
                    style={{ width: `${(form.spaceAvailable / SPACE_UPPER_LIMIT) * 100}%` }}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => adjustSpace(0.5)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader><h2 className="font-semibold">Amenities</h2></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(AMENITY_LABELS) as [Amenity, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAmenity(key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.amenities.includes(key)
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><h2 className="font-semibold">Location</h2></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Click on the map or search to set location.
              </p>
              <GoogleMap
                center={
                  form.latitude !== 0 && form.longitude !== 0
                    ? { lat: form.latitude, lng: form.longitude }
                    : undefined
                }
                zoom={13}
                onClick={(lat, lng) => {
                  setForm({ ...form, latitude: lat, longitude: lng });
                  setPriceRec(null);
                  fetchPriceRecommendation(lat, lng);
                }}
                showSearch
                className="h-56"
                markers={
                  form.latitude !== 0 && form.longitude !== 0
                    ? [{ lat: form.latitude, lng: form.longitude, title: "Listing location" }]
                    : []
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={form.latitude || ""}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                  placeholder="43.4723"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={form.longitude || ""}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                  placeholder="-80.5449"
                />
              </div>
              {form.latitude !== 0 && form.longitude !== 0 && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <MapPin className="h-4 w-4" />
                  Location set: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Listing"}
          </Button>
        </div>
      </form>
    </div>
  );
}
