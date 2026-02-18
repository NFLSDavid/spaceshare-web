"use client";
import { useState, useCallback } from "react";

interface PriceRecommendation {
  recommendedPrice: number;
  count: number;
}

export function usePriceRecommendation() {
  const [priceRec, setPriceRec] = useState<PriceRecommendation | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const fetchPriceRecommendation = useCallback(
    async (lat: number, lng: number) => {
      if (!lat || !lng) return;
      setLoadingPrice(true);
      try {
        const res = await fetch(
          `/api/listings/price-recommendation?lat=${lat}&lng=${lng}`,
        );
        const data = await res.json();
        setPriceRec(data);
      } catch {
        // silently fail — price recommendation is non-critical
      }
      setLoadingPrice(false);
    },
    [],
  );

  const clearPriceRec = useCallback(() => {
    setPriceRec(null);
  }, []);

  return { priceRec, loadingPrice, fetchPriceRecommendation, clearPriceRec };
}
