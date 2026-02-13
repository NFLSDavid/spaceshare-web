import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { POST } = await import("../../../[id]/rate/route");

const mockSession = { user: { id: "client1" } };
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/listings/[id]/rate", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.reservation.findUnique.mockReset();
    prismaMock.reservation.update.mockReset();
    prismaMock.listing.update.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 when reservationId is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when liked is not boolean", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: "yes" },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 404 when reservation not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when user is not the client", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "other-user",
      listingId: "l1",
      status: "APPROVED",
      rated: false,
      startDate: new Date("2020-01-01"),
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 400 when listing doesn't match", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "other-listing",
      status: "APPROVED",
      rated: false,
      startDate: new Date("2020-01-01"),
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when status is not APPROVED", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "l1",
      status: "PENDING",
      rated: false,
      startDate: new Date("2020-01-01"),
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when already rated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "l1",
      status: "APPROVED",
      rated: true,
      startDate: new Date("2020-01-01"),
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when start date is in the future", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "l1",
      status: "APPROVED",
      rated: false,
      startDate: new Date(Date.now() + 86400000 * 30),
    });
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("increments likes when liked=true", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "l1",
      status: "APPROVED",
      rated: false,
      startDate: new Date("2020-01-01"),
    });
    prismaMock.listing.update.mockResolvedValue({});
    prismaMock.reservation.update.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: true },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.listing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { likes: { increment: 1 } },
      })
    );
  });

  it("does not increment likes when liked=false", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.reservation.findUnique.mockResolvedValue({
      id: "r1",
      clientId: "client1",
      listingId: "l1",
      status: "APPROVED",
      rated: false,
      startDate: new Date("2020-01-01"),
    });
    prismaMock.reservation.update.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/listings/l1/rate", {
      method: "POST",
      body: { reservationId: "r1", liked: false },
    });
    const res = await POST(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.listing.update).not.toHaveBeenCalled();
  });
});
