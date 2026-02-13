import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, PUT } = await import("../route");

const regularSession = { user: { id: "u1", isAdmin: false } };
const adminSession = { user: { id: "admin1", isAdmin: true } };

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/users");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns single user by id", async () => {
    vi.mocked(getServerSession).mockResolvedValue(regularSession as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u2", firstName: "Bob" });
    const req = createRequest("http://localhost:3000/api/users?id=u2");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.firstName).toBe("Bob");
  });

  it("returns 403 for non-admin requesting all users", async () => {
    vi.mocked(getServerSession).mockResolvedValue(regularSession as any);
    const req = createRequest("http://localhost:3000/api/users");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("admin can get all users", async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any);
    prismaMock.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }]);
    const req = createRequest("http://localhost:3000/api/users");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body).toHaveLength(2);
  });
});

describe("PUT /api/users", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.user.update.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/users", {
      method: "PUT",
      body: { firstName: "New" },
    });
    const res = await PUT(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("user can update own profile", async () => {
    vi.mocked(getServerSession).mockResolvedValue(regularSession as any);
    prismaMock.user.update.mockResolvedValue({ id: "u1", firstName: "Updated" });
    const req = createRequest("http://localhost:3000/api/users", {
      method: "PUT",
      body: { firstName: "Updated", lastName: "Name" },
    });
    const res = await PUT(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.firstName).toBe("Updated");
  });

  it("admin can verify a user", async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any);
    prismaMock.user.update.mockResolvedValue({ id: "u2", isVerified: 2 });
    const req = createRequest("http://localhost:3000/api/users", {
      method: "PUT",
      body: { targetUserId: "u2", isVerified: 2 },
    });
    const res = await PUT(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.isVerified).toBe(2);
  });

  it("uploading governmentId resets verification", async () => {
    vi.mocked(getServerSession).mockResolvedValue(regularSession as any);
    prismaMock.user.update.mockResolvedValue({ id: "u1", isVerified: 0 });
    const req = createRequest("http://localhost:3000/api/users", {
      method: "PUT",
      body: { governmentId: "new-id-url" },
    });
    await PUT(req);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ governmentId: "new-id-url", isVerified: 0 }),
      })
    );
  });
});
