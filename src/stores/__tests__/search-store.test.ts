import { describe, it, expect, beforeEach } from "vitest";
import { useSearchStore } from "../search-store";

describe("useSearchStore", () => {
  beforeEach(() => {
    // Reset to initial state
    useSearchStore.setState({
      latitude: 0,
      longitude: 0,
      radius: 5,
      spaceRequired: 1,
      startDate: "",
      endDate: "",
      sortBy: "CLOSEST",
      filter: {
        minPrice: 0,
        maxPrice: 100,
        minSpace: 0,
        maxSpace: 100,
        amenities: [],
      },
    });
  });

  it("has correct default values", () => {
    const state = useSearchStore.getState();
    expect(state.latitude).toBe(0);
    expect(state.longitude).toBe(0);
    expect(state.radius).toBe(5);
    expect(state.spaceRequired).toBe(1);
    expect(state.startDate).toBe("");
    expect(state.endDate).toBe("");
    expect(state.sortBy).toBe("CLOSEST");
    expect(state.filter.minPrice).toBe(0);
    expect(state.filter.maxPrice).toBe(100);
    expect(state.filter.amenities).toEqual([]);
  });

  it("setLocation updates lat and lng", () => {
    useSearchStore.getState().setLocation(43.65, -79.38);
    const state = useSearchStore.getState();
    expect(state.latitude).toBe(43.65);
    expect(state.longitude).toBe(-79.38);
  });

  it("setRadius updates radius", () => {
    useSearchStore.getState().setRadius(10);
    expect(useSearchStore.getState().radius).toBe(10);
  });

  it("setSpaceRequired updates spaceRequired", () => {
    useSearchStore.getState().setSpaceRequired(5);
    expect(useSearchStore.getState().spaceRequired).toBe(5);
  });

  it("setDateRange updates start and end dates", () => {
    useSearchStore.getState().setDateRange("2025-01-01", "2025-01-10");
    const state = useSearchStore.getState();
    expect(state.startDate).toBe("2025-01-01");
    expect(state.endDate).toBe("2025-01-10");
  });

  it("setSortBy updates sortBy", () => {
    useSearchStore.getState().setSortBy("CHEAPEST");
    expect(useSearchStore.getState().sortBy).toBe("CHEAPEST");
  });

  it("setFilter does partial merge", () => {
    useSearchStore.getState().setFilter({ minPrice: 10 });
    const state = useSearchStore.getState();
    expect(state.filter.minPrice).toBe(10);
    expect(state.filter.maxPrice).toBe(100); // unchanged
    expect(state.filter.amenities).toEqual([]); // unchanged
  });

  it("setFilter merges multiple times", () => {
    useSearchStore.getState().setFilter({ minPrice: 5 });
    useSearchStore.getState().setFilter({ maxPrice: 50 });
    const state = useSearchStore.getState();
    expect(state.filter.minPrice).toBe(5);
    expect(state.filter.maxPrice).toBe(50);
  });

  it("resetFilter restores defaults", () => {
    useSearchStore.getState().setFilter({ minPrice: 50, maxPrice: 200 });
    useSearchStore.getState().resetFilter();
    const state = useSearchStore.getState();
    expect(state.filter.minPrice).toBe(0);
    expect(state.filter.maxPrice).toBe(100);
    expect(state.filter.amenities).toEqual([]);
  });

  it("resetFilter does not affect other state", () => {
    useSearchStore.getState().setRadius(20);
    useSearchStore.getState().setFilter({ minPrice: 50 });
    useSearchStore.getState().resetFilter();
    expect(useSearchStore.getState().radius).toBe(20);
  });
});
