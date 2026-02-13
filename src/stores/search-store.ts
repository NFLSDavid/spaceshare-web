import { create } from "zustand";
import type { Amenity, SortOption, FilterCriteria } from "@/types";

interface SearchStore {
  latitude: number;
  longitude: number;
  radius: number;
  spaceRequired: number;
  startDate: string;
  endDate: string;
  sortBy: SortOption;
  filter: FilterCriteria;
  setLocation: (lat: number, lng: number) => void;
  setRadius: (r: number) => void;
  setSpaceRequired: (s: number) => void;
  setDateRange: (start: string, end: string) => void;
  setSortBy: (s: SortOption) => void;
  setFilter: (f: Partial<FilterCriteria>) => void;
  resetFilter: () => void;
}

const defaultFilter: FilterCriteria = {
  minPrice: 0,
  maxPrice: 100,
  minSpace: 0,
  maxSpace: 100,
  amenities: [],
};

export const useSearchStore = create<SearchStore>((set) => ({
  latitude: 0,
  longitude: 0,
  radius: 5,
  spaceRequired: 1,
  startDate: "",
  endDate: "",
  sortBy: "CLOSEST",
  filter: { ...defaultFilter },
  setLocation: (lat, lng) => set({ latitude: lat, longitude: lng }),
  setRadius: (r) => set({ radius: r }),
  setSpaceRequired: (s) => set({ spaceRequired: s }),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
  setSortBy: (s) => set({ sortBy: s }),
  setFilter: (f) => set((state) => ({ filter: { ...state.filter, ...f } })),
  resetFilter: () => set({ filter: { ...defaultFilter } }),
}));
