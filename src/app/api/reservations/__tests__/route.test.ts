import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  newReservationRequestEmail: vi.fn().mockReturnValue({ subject: "New Req", html: "<p>r</p>" }),
}));
vi.mock("date-fns", () => ({
  format: vi.fn((d: any, f: string) => "Jan 1, 2025"),
}));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../route");

const mockSession = {
  user: { id: "client1", firstName: "John", lastName: "Doe", email: "j@test.com" },
};

describe("GET /api/reservations", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.reservation.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/reservations");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns host reservations when asHost=true", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findMany.mockResolvedValue([{ id: "r1" }]);
    const req = createRequest("http://localhost:3000/api/reservations?asHost=true");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hostId: "client1" } })
    );
  });

  it("returns client reservations by default", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/reservations");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: "client1" } })
    );
  });
});

describe("POST /api/reservations", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findUnique.mockReset();
    prismaMock.reservation.create.mockReset();
    prismaMock.user.findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: { listingId: "l1" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when listing not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: { listingId: "nonexistent", spaceRequested: 5, startDate: "2025-01-01", endDate: "2025-01-05" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 400 when reserving own listing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      hostId: "client1",
      spaceAvailable: 10,
      bookings: [],
      price: 10,
    });
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: { listingId: "l1", spaceRequested: 5, startDate: "2025-01-01", endDate: "2025-01-05" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when insufficient space", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      hostId: "host1",
      spaceAvailable: 5,
      bookings: [{ startDate: "2025-01-01", endDate: "2025-01-10", reservedSpace: 4 }],
      price: 10,
    });
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: { listingId: "l1", spaceRequested: 2, startDate: "2025-01-02", endDate: "2025-01-05" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 201 on success with correct totalCost", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      hostId: "host1",
      spaceAvailable: 20,
      bookings: [],
      price: 10,
      title: "Test",
    });
    prismaMock.reservation.create.mockResolvedValue({
      id: "r1",
      totalCost: 200,
      listing: { id: "l1", title: "Test" },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "host@test.com", firstName: "Host" });
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: {
        listingId: "l1",
        spaceRequested: 5,
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(201);
    // price=10 * space=5 * days=4 = 200
    expect(prismaMock.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCost: 200 }),
      })
    );
  });

  it("sends email notification to host", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const sendEmail = (await import("@/lib/email")).sendEmail;
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      hostId: "host1",
      spaceAvailable: 20,
      bookings: [],
      price: 10,
      title: "Test",
    });
    prismaMock.reservation.create.mockResolvedValue({
      id: "r1",
      totalCost: 40,
      listing: { id: "l1" },
      host: { id: "host1" },
      client: { id: "client1" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ email: "host@test.com", firstName: "Host" });
    const req = createRequest("http://localhost:3000/api/reservations", {
      method: "POST",
      body: {
        listingId: "l1",
        spaceRequested: 2,
        startDate: "2025-01-01",
        endDate: "2025-01-03",
      },
    });
    await POST(req);
    expect(sendEmail).toHaveBeenCalled();
  });
});
