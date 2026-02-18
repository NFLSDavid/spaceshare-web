"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { SPACE_OFFERING_LOWER_LIMIT, SPACE_UPPER_LIMIT } from "@/types";
import type { Amenity, ListingWithHost } from "@/types";
import { useListingPhotos } from "@/hooks/use-listing-photos";
import { usePriceRecommendation } from "@/hooks/use-price-recommendation";

interface ListingForm {
  title: string;
  description: string;
  price: string;
  spaceAvailable: number;
  amenities: Amenity[];
  latitude: number;
  longitude: number;
  availableFrom: string;
  availableTo: string;
}

const initialForm: ListingForm = {
  title: "",
  description: "",
  price: "",
  spaceAvailable: 1,
  amenities: [],
  latitude: 0,
  longitude: 0,
  availableFrom: "",
  availableTo: "",
};

export function useListingForm(editId?: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [form, setForm] = useState<ListingForm>(initialForm);

  const { photos, uploading, handlePhotoUpload, removePhoto, setInitialPhotos } =
    useListingPhotos();
  const { priceRec, loadingPrice, fetchPriceRecommendation, clearPriceRec } =
    usePriceRecommendation();

  const isEdit = !!editId;

  // Fetch existing listing data for edit mode
  useEffect(() => {
    if (!editId) return;
    async function fetchListing() {
      try {
        const res = await fetch(`/api/listings/${editId}`);
        const data: ListingWithHost = await res.json();
        setForm({
          title: data.title,
          description: data.description,
          price: data.price.toString(),
          spaceAvailable: data.spaceAvailable,
          amenities: data.amenities as Amenity[],
          latitude: data.latitude,
          longitude: data.longitude,
          availableFrom: data.availableFrom ? new Date(data.availableFrom).toISOString().split("T")[0] : "",
          availableTo: data.availableTo ? new Date(data.availableTo).toISOString().split("T")[0] : "",
        });
        setInitialPhotos(data.photos);
      } catch {
        toast("Failed to load listing", "error");
      }
      setFetching(false);
    }
    fetchListing();
  }, [editId, setInitialPhotos]);

  const updateForm = useCallback((updates: Partial<ListingForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleAmenity = useCallback((amenity: Amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const adjustSpace = useCallback((delta: number) => {
    setForm((prev) => ({
      ...prev,
      spaceAvailable: Math.min(
        SPACE_UPPER_LIMIT,
        Math.max(SPACE_OFFERING_LOWER_LIMIT, prev.spaceAvailable + delta),
      ),
    }));
  }, []);

  const setLocation = useCallback(
    (lat: number, lng: number) => {
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      clearPriceRec();
      fetchPriceRecommendation(lat, lng);
    },
    [fetchPriceRecommendation, clearPriceRec],
  );

  const applyRecommendedPrice = useCallback(() => {
    if (priceRec) {
      setForm((prev) => ({
        ...prev,
        price: priceRec.recommendedPrice.toFixed(2),
      }));
    }
  }, [priceRec]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (photos.length === 0) {
        toast("Please add at least one photo", "error");
        return;
      }
      if (!isEdit && (!form.latitude || !form.longitude)) {
        toast("Please set a location on the map", "error");
        return;
      }

      setLoading(true);
      try {
        const url = isEdit ? `/api/listings/${editId}` : "/api/listings";
        const method = isEdit ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, photos }),
        });

        if (res.ok) {
          toast(
            isEdit ? "Listing updated!" : "Listing created successfully!",
            "success",
          );
          router.push("/listings");
        } else {
          const data = await res.json();
          toast(
            data.error ||
              (isEdit ? "Failed to update" : "Failed to create listing"),
            "error",
          );
        }
      } catch {
        toast("An error occurred", "error");
      }
      setLoading(false);
    },
    [form, photos, isEdit, editId, router],
  );

  return {
    form,
    updateForm,
    photos,
    uploading,
    loading,
    fetching,
    priceRec,
    loadingPrice,
    isEdit,
    handlePhotoUpload,
    removePhoto,
    toggleAmenity,
    adjustSpace,
    fetchPriceRecommendation,
    setLocation,
    applyRecommendedPrice,
    handleSubmit,
  };
}
