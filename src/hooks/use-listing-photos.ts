"use client";
import { useState, useCallback } from "react";
import { toast } from "@/components/ui/toast";

export function useListingPhotos(initial: string[] = []) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);

  const setInitialPhotos = useCallback((urls: string[]) => {
    setPhotos(urls);
  }, []);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", "spaceshare/listings");
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok) setPhotos((prev) => [...prev, data.url]);
        }
      } catch {
        toast("Failed to upload image", "error");
      }
      setUploading(false);
    },
    [],
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { photos, uploading, handlePhotoUpload, removePhoto, setInitialPhotos };
}
