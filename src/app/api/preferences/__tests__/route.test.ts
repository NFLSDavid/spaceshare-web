import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, PUT } = await import("../route");

const mockSession = { user: { id: "u1", email: "u@test.com" } };

describe("GET /api/preferences", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.preferences.findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/preferences");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns existing preferences", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.preferences.findUnique.mockResolvedValue({
      userId: "u1",
      isActive: true,
      radius: 10,
    });
    const req = createRequest("http://localhost:3000/api/preferences");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.isActive).toBe(true);
    expect(body.radius).toBe(10);
  });

  it("returns defaults when no preferences exist", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.preferences.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/preferences");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.userId).toBe("u1");
    expect(body.isActive).toBe(false);
    expect(body.radius).toBe(5);
  });
});

describe("PUT /api/preferences", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.preferences.upsert.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/preferences", {
      method: "PUT",
      body: { isActive: true },
    });
    const res = await PUT(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("upserts preferences", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.preferences.upsert.mockResolvedValue({
      userId: "u1",
      isActive: true,
      radius: 15,
    });
    const req = createRequest("http://localhost:3000/api/preferences", {
      method: "PUT",
      body: { isActive: true, radius: 15, latitude: 43.65, longitude: -79.38 },
    });
    const res = await PUT(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.isActive).toBe(true);
  });

  it("upserts with defaults for create", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.preferences.upsert.mockResolvedValue({ userId: "u1" });
    const req = createRequest("http://localhost:3000/api/preferences", {
      method: "PUT",
      body: {},
    });
    await PUT(req);
    expect(prismaMock.preferences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "u1",
          isActive: false,
          radius: 5,
          email: "u@test.com",
        }),
      })
    );
  });
});
