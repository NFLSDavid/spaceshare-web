"use client";
import { useRouter } from "next/navigation";
import { useListingForm } from "@/hooks/use-listing-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleMap } from "@/components/google-map";
import { AMENITY_LABELS, SPACE_UPPER_LIMIT } from "@/types";
import type { Amenity } from "@/types";
import { Upload, X, Minus, Plus, MapPin, Lightbulb } from "lucide-react";

export default function NewListingPage() {
  const router = useRouter();
  const {
    form,
    updateForm,
    photos,
    uploading,
    loading,
    priceRec,
    loadingPrice,
    handlePhotoUpload,
    removePhoto,
    toggleAmenity,
    adjustSpace,
    fetchPriceRecommendation,
    setLocation,
    applyRecommendedPrice,
    handleSubmit,
  } = useListingForm();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Photos</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
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
          <CardHeader>
            <h2 className="font-semibold">Details</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              placeholder="e.g. Spacious Garage Storage"
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
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
                onChange={(e) => updateForm({ price: e.target.value })}
                placeholder="0.00"
                required
              />
              {form.latitude !== 0 && form.longitude !== 0 && (
                <div className="mt-2">
                  {priceRec && priceRec.count > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <span className="text-gray-600">
                        Suggested: ${priceRec.recommendedPrice.toFixed(2)}{" "}
                        (based on {priceRec.count} nearby listings)
                      </span>
                      <button
                        type="button"
                        onClick={applyRecommendedPrice}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  ) : priceRec && priceRec.count === 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      No nearby listings to compare
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        fetchPriceRecommendation(form.latitude, form.longitude)
                      }
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSpace(-0.5)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 rounded-full h-2 transition-all"
                    style={{
                      width: `${(form.spaceAvailable / SPACE_UPPER_LIMIT) * 100}%`,
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSpace(0.5)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Availability</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Set the date range when your space is available for booking.
            </p>
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              return (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Available From"
                    type="date"
                    min={today}
                    value={form.availableFrom}
                    onChange={(e) => updateForm({ availableFrom: e.target.value })}
                  />
                  <Input
                    label="Available To"
                    type="date"
                    min={form.availableFrom || today}
                    value={form.availableTo}
                    onChange={(e) => updateForm({ availableTo: e.target.value })}
                  />
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Amenities</h2>
          </CardHeader>
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
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Location</h2>
          </CardHeader>
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
                onClick={(lat, lng) => setLocation(lat, lng)}
                showSearch
                className="h-56"
                markers={
                  form.latitude !== 0 && form.longitude !== 0
                    ? [
                        {
                          lat: form.latitude,
                          lng: form.longitude,
                          title: "Listing location",
                        },
                      ]
                    : []
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={form.latitude || ""}
                  onChange={(e) =>
                    updateForm({ latitude: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="43.4723"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={form.longitude || ""}
                  onChange={(e) =>
                    updateForm({ longitude: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="-80.5449"
                />
              </div>
              {form.latitude !== 0 && form.longitude !== 0 && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <MapPin className="h-4 w-4" />
                  Location set: {form.latitude.toFixed(4)},{" "}
                  {form.longitude.toFixed(4)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
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
