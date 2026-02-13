import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("new-hashed") } }));

import bcrypt from "bcryptjs";
const { POST } = await import("../../reset-password/route");

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    prismaMock.verificationToken.findUnique.mockReset();
    prismaMock.verificationToken.delete.mockReset();
    prismaMock.user.update.mockReset();
    vi.mocked(bcrypt.hash).mockReset();
    vi.mocked(bcrypt.hash).mockResolvedValue("new-hashed" as never);
  });

  it("returns 400 when token is missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { password: "NewStr0ng!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "abc" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for weak password", async () => {
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "abc", password: "123456" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "bad-token", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for expired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "expired",
      type: "PASSWORD_RESET",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "expired", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 200 on success and updates password", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "valid",
      type: "PASSWORD_RESET",
      userId: "u1",
      expiresAt: new Date(Date.now() + 100000),
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "valid", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { password: "new-hashed" },
      })
    );
  });

  it("deletes token after successful reset", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "valid",
      type: "PASSWORD_RESET",
      userId: "u1",
      expiresAt: new Date(Date.now() + 100000),
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: { token: "valid", password: "Str0ngP@ss!" },
    });
    await POST(req);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
