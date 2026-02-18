import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../route");

const mockSession = { user: { id: "u1" } };

describe("GET /api/shortlist", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.shortlist.findUnique.mockReset();
    prismaMock.listing.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/shortlist");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns empty array when no shortlist", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/shortlist");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns empty array when shortlist has no ids", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ listingIds: [] });
    const req = createRequest("http://localhost:3000/api/shortlist");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body).toEqual([]);
  });

  it("returns active listings from shortlist", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ listingIds: ["l1", "l2"] });
    prismaMock.listing.findMany.mockResolvedValue([
      { id: "l1", isActive: true },
    ]);
    const req = createRequest("http://localhost:3000/api/shortlist");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });
});

describe("POST /api/shortlist", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.shortlist.findUnique.mockReset();
    prismaMock.shortlist.create.mockReset();
    prismaMock.shortlist.update.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "add" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("creates shortlist on first use", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue(null);
    prismaMock.shortlist.upsert.mockResolvedValue({ userId: "u1", listingIds: ["l1"] });
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "add" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.shortlist.upsert).toHaveBeenCalled();
  });

  it("adds listing with action=add", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ userId: "u1", listingIds: [] });
    prismaMock.shortlist.upsert.mockResolvedValue({ listingIds: ["l1"] });
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "add" },
    });
    await POST(req);
    expect(prismaMock.shortlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { listingIds: ["l1"] },
      })
    );
  });

  it("removes listing with action=remove", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ userId: "u1", listingIds: ["l1", "l2"] });
    prismaMock.shortlist.upsert.mockResolvedValue({ listingIds: ["l2"] });
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "remove" },
    });
    await POST(req);
    expect(prismaMock.shortlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { listingIds: ["l2"] },
      })
    );
  });

  it("toggles listing with action=toggle (add)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ userId: "u1", listingIds: [] });
    prismaMock.shortlist.upsert.mockResolvedValue({ listingIds: ["l1"] });
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "toggle" },
    });
    await POST(req);
    expect(prismaMock.shortlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { listingIds: ["l1"] },
      })
    );
  });

  it("toggles listing with action=toggle (remove)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.shortlist.findUnique.mockResolvedValue({ userId: "u1", listingIds: ["l1"] });
    prismaMock.shortlist.upsert.mockResolvedValue({ listingIds: [] });
    const req = createRequest("http://localhost:3000/api/shortlist", {
      method: "POST",
      body: { listingId: "l1", action: "toggle" },
    });
    await POST(req);
    expect(prismaMock.shortlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { listingIds: [] },
      })
    );
  });
});
