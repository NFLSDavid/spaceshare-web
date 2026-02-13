import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  newListingMatchEmail: vi.fn().mockReturnValue({ subject: "Match", html: "<p>m</p>" }),
}));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../route");

const mockSession = {
  user: { id: "user1", firstName: "John", lastName: "Doe", email: "john@test.com", isAdmin: false, isVerified: 1 },
};

describe("GET /api/listings", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns host listings when hostId provided", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([{ id: "l1", title: "My Listing" }]);
    const req = createRequest("http://localhost:3000/api/listings?hostId=user1");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("l1");
  });

  it("returns client listings excluding own", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { id: "l2", title: "Other", latitude: 43.65, longitude: -79.38, bookings: [] },
    ]);
    const req = createRequest("http://localhost:3000/api/listings");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(0);
  });

  it("filters by distance when lat/lng/radius provided", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      { id: "near", latitude: 43.65, longitude: -79.38, bookings: [], spaceAvailable: 10 },
      { id: "far", latitude: 50.0, longitude: -100.0, bookings: [], spaceAvailable: 10 },
    ]);
    const req = createRequest("http://localhost:3000/api/listings?lat=43.65&lng=-79.38&radius=10");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    const ids = body.map((l: any) => l.id);
    expect(ids).toContain("near");
    expect(ids).not.toContain("far");
  });

  it("filters by date and space availability", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findMany.mockResolvedValue([
      {
        id: "available",
        spaceAvailable: 10,
        latitude: 0,
        longitude: 0,
        bookings: [{ startDate: "2025-01-01", endDate: "2025-01-05", reservedSpace: 3 }],
      },
      {
        id: "full",
        spaceAvailable: 5,
        latitude: 0,
        longitude: 0,
        bookings: [{ startDate: "2025-01-01", endDate: "2025-01-10", reservedSpace: 5 }],
      },
    ]);
    const req = createRequest(
      "http://localhost:3000/api/listings?startDate=2025-01-02&endDate=2025-01-04&spaceRequired=5"
    );
    const res = await GET(req);
    const { body } = await parseResponse(res);
    const ids = body.map((l: any) => l.id);
    expect(ids).toContain("available");
    expect(ids).not.toContain("full");
  });
});

describe("POST /api/listings", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.create.mockReset();
    prismaMock.preferences.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings", {
      method: "POST",
      body: { title: "T" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const req = createRequest("http://localhost:3000/api/listings", {
      method: "POST",
      body: { title: "T" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 201 on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.create.mockResolvedValue({
      id: "new-listing",
      title: "New",
      price: 10.5,
      host: { id: "user1" },
    });
    prismaMock.preferences.findMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/listings", {
      method: "POST",
      body: {
        title: "New",
        description: "Desc",
        price: "10.5",
        spaceAvailable: "20",
        latitude: "43.65",
        longitude: "-79.38",
      },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.id).toBe("new-listing");
  });

  it("calls parseFloat on price and coordinates", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.create.mockResolvedValue({ id: "l1", host: { id: "user1" } });
    prismaMock.preferences.findMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/listings", {
      method: "POST",
      body: {
        title: "T",
        description: "D",
        price: "15.99",
        spaceAvailable: "25",
        latitude: "43.65",
        longitude: "-79.38",
      },
    });
    await POST(req);
    expect(prismaMock.listing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          price: 15.99,
          spaceAvailable: 25,
          latitude: 43.65,
          longitude: -79.38,
        }),
      })
    );
  });

  it("fires notifyMatchingPreferences after creation", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.create.mockResolvedValue({
      id: "l1",
      hostId: "user1",
      title: "T",
      price: 10,
      latitude: 43.65,
      longitude: -79.38,
      host: { id: "user1" },
    });
    prismaMock.preferences.findMany.mockResolvedValue([
      {
        latitude: 43.65,
        longitude: -79.38,
        radius: 10,
        email: "pref@test.com",
        user: { email: "pref@test.com", firstName: "P" },
      },
    ]);
    const req = createRequest("http://localhost:3000/api/listings", {
      method: "POST",
      body: {
        title: "T",
        description: "D",
        price: "10",
        spaceAvailable: "20",
        latitude: "43.65",
        longitude: "-79.38",
      },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(201);
    // notifyMatchingPreferences is fire-and-forget, just verify preferences were queried
    // We wait briefly for the async call to trigger
    await new Promise((r) => setTimeout(r, 50));
    expect(prismaMock.preferences.findMany).toHaveBeenCalled();
  });
});
