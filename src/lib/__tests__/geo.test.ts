import { describe, it, expect } from "vitest";
import { calculateDistanceKm, roundToTwo } from "../geo";

describe("calculateDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(calculateDistanceKm(0, 0, 0, 0)).toBe(0);
  });

  it("returns 0 for same non-zero coordinates", () => {
    expect(calculateDistanceKm(43.65, -79.38, 43.65, -79.38)).toBe(0);
  });

  it("calculates distance between Toronto and Montreal (~504 km)", () => {
    const dist = calculateDistanceKm(43.6532, -79.3832, 45.5017, -73.5673);
    expect(dist).toBeGreaterThan(490);
    expect(dist).toBeLessThan(520);
  });

  it("calculates distance between London and Paris (~343 km)", () => {
    const dist = calculateDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(355);
  });

  it("is symmetric (A→B equals B→A)", () => {
    const ab = calculateDistanceKm(43.65, -79.38, 45.50, -73.57);
    const ba = calculateDistanceKm(45.50, -73.57, 43.65, -79.38);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it("handles equator crossing", () => {
    const dist = calculateDistanceKm(1, 0, -1, 0);
    expect(dist).toBeGreaterThan(220);
    expect(dist).toBeLessThan(225);
  });

  it("handles meridian crossing", () => {
    const dist = calculateDistanceKm(0, -1, 0, 1);
    expect(dist).toBeGreaterThan(220);
    expect(dist).toBeLessThan(225);
  });

  it("handles poles", () => {
    const dist = calculateDistanceKm(90, 0, -90, 0);
    expect(dist).toBeGreaterThan(20000);
    expect(dist).toBeLessThan(20100);
  });

  it("handles short distances (~1 km)", () => {
    const dist = calculateDistanceKm(43.65, -79.38, 43.66, -79.38);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThan(1.2);
  });
});

describe("roundToTwo", () => {
  it("rounds 1.005 correctly", () => {
    expect(roundToTwo(1.005)).toBe(1.01);
  });

  it("rounds negative numbers", () => {
    expect(roundToTwo(-1.005)).toBe(-1);
  });

  it("returns integers unchanged", () => {
    expect(roundToTwo(5)).toBe(5);
  });

  it("returns 0 for 0", () => {
    expect(roundToTwo(0)).toBe(0);
  });

  it("rounds 1.999 to 2", () => {
    expect(roundToTwo(1.999)).toBe(2);
  });

  it("handles long decimals", () => {
    expect(roundToTwo(3.14159)).toBe(3.14);
  });
});
