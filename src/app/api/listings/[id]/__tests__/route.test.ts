import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, PUT, DELETE } = await import("../../[id]/route");

const mockSession = { user: { id: "host1" } };
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/listings/[id]", () => {
  beforeEach(() => {
    prismaMock.listing.findUnique.mockReset();
  });

  it("returns 200 with listing", async () => {
    prismaMock.listing.findUnique.mockResolvedValue({
      id: "l1",
      title: "Test",
      host: { id: "h1" },
      bookings: [],
    });
    const req = createRequest("http://localhost:3000/api/listings/l1");
    const res = await GET(req, makeParams("l1"));
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.id).toBe("l1");
  });

  it("returns 404 when not found", async () => {
    prismaMock.listing.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/nope");
    const res = await GET(req, makeParams("nope"));
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });
});

describe("PUT /api/listings/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findUnique.mockReset();
    prismaMock.listing.update.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await PUT(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 403 when not owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({ id: "l1", hostId: "other-user" });
    const req = createRequest("http://localhost:3000/api/listings/l1", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await PUT(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 200 on partial update", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({ id: "l1", hostId: "host1" });
    prismaMock.listing.update.mockResolvedValue({
      id: "l1",
      title: "Updated",
      host: { id: "host1" },
    });
    const req = createRequest("http://localhost:3000/api/listings/l1", {
      method: "PUT",
      body: { title: "Updated" },
    });
    const res = await PUT(req, makeParams("l1"));
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.title).toBe("Updated");
  });
});

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.listing.findUnique.mockReset();
    prismaMock.listing.delete.mockReset();
    prismaMock.reservation.findMany.mockReset();
    prismaMock.chat.deleteMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/listings/l1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 403 when not owner", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({ id: "l1", hostId: "other-user" });
    const req = createRequest("http://localhost:3000/api/listings/l1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 409 when listing has active reservations", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({ id: "l1", hostId: "host1" });
    prismaMock.reservation.findMany.mockResolvedValue([{ id: "r1", status: "PENDING" }]);
    const req = createRequest("http://localhost:3000/api/listings/l1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(409);
  });

  it("returns 200 and deletes chats then listing on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.listing.findUnique.mockResolvedValue({ id: "l1", hostId: "host1" });
    prismaMock.reservation.findMany.mockResolvedValue([]);
    prismaMock.chat.deleteMany.mockResolvedValue({});
    prismaMock.listing.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/listings/l1", { method: "DELETE" });
    const res = await DELETE(req, makeParams("l1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.chat.deleteMany).toHaveBeenCalledWith({ where: { listingId: "l1" } });
    expect(prismaMock.listing.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });
});
