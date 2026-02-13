import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET } = await import("../../price-recommendation/route");

const mockSession = { user: { id: "u1" } };

describe("GET /api/listings/price-recommendation", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation?lat=43.65&lng=-79.38");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 when coords are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 0 when no nearby listings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { price: 10, latitude: 80, longitude: 80 }, // far away
    ]);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation?lat=43.65&lng=-79.38");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body.recommendedPrice).toBe(0);
    expect(body.count).toBe(0);
  });

  it("returns correct average for nearby listings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { price: 10, latitude: 43.65, longitude: -79.38 },
      { price: 20, latitude: 43.651, longitude: -79.381 },
      { price: 30, latitude: 43.652, longitude: -79.382 },
    ]);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation?lat=43.65&lng=-79.38");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body.recommendedPrice).toBe(20);
    expect(body.count).toBe(3);
  });

  it("excludes listings beyond 5km", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { price: 10, latitude: 43.65, longitude: -79.38 }, // nearby
      { price: 100, latitude: 44.0, longitude: -79.38 }, // ~39km away
    ]);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation?lat=43.65&lng=-79.38");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body.recommendedPrice).toBe(10);
    expect(body.count).toBe(1);
  });

  it("returns correct count of nearby listings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { price: 15, latitude: 43.65, longitude: -79.38 },
      { price: 25, latitude: 43.651, longitude: -79.379 },
    ]);
    const req = createRequest("http://localhost:3000/api/listings/price-recommendation?lat=43.65&lng=-79.38");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body.count).toBe(2);
  });
});
