import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET } = await import("../../../[id]/availability/route");

const mockSession = { user: { id: "u1" } };
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/listings/[id]/availability", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-03");
    const res = await GET(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 when dates are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const req = createRequest("http://localhost:3000/api/listings/l1/availability");
    const res = await GET(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-03");
    const res = await GET(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns daily availability with no bookings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      spaceAvailable: 10,
      bookings: [],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-03");
    const res = await GET(req, makeParams("l1"));
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body[0].available).toBe(10);
    expect(body[0].date).toBe("2025-01-01");
  });

  it("subtracts booked space from overlapping bookings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      spaceAvailable: 10,
      bookings: [
        { startDate: "2025-01-01", endDate: "2025-01-03", reservedSpace: 4 },
      ],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-03");
    const res = await GET(req, makeParams("l1"));
    const { body } = await parseResponse(res);
    // Jan 1 and Jan 2 overlap with the booking, Jan 3 doesn't (booking end is exclusive of Jan 3 day)
    expect(body[0].available).toBe(6); // Jan 1
    expect(body[1].available).toBe(6); // Jan 2
  });

  it("floors available at 0", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      spaceAvailable: 5,
      bookings: [
        { startDate: "2025-01-01", endDate: "2025-01-03", reservedSpace: 3 },
        { startDate: "2025-01-01", endDate: "2025-01-03", reservedSpace: 4 },
      ],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-01");
    const res = await GET(req, makeParams("l1"));
    const { body } = await parseResponse(res);
    expect(body[0].available).toBe(0);
  });

  it("handles multiple overlapping bookings", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      spaceAvailable: 20,
      bookings: [
        { startDate: "2025-01-01", endDate: "2025-01-05", reservedSpace: 5 },
        { startDate: "2025-01-02", endDate: "2025-01-04", reservedSpace: 3 },
      ],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-03");
    const res = await GET(req, makeParams("l1"));
    const { body } = await parseResponse(res);
    expect(body[0].available).toBe(15); // Jan 1: only first booking
    expect(body[1].available).toBe(12); // Jan 2: both bookings
    expect(body[2].available).toBe(12); // Jan 3: both bookings
  });

  it("rounds available to 2 decimal places", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      spaceAvailable: 10.555,
      bookings: [
        { startDate: "2025-01-01", endDate: "2025-01-02", reservedSpace: 3.333 },
      ],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/availability?startDate=2025-01-01&endDate=2025-01-01");
    const res = await GET(req, makeParams("l1"));
    const { body } = await parseResponse(res);
    expect(body[0].available).toBe(7.22);
  });
});
