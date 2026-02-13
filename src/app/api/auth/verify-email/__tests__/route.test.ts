import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  emailVerificationEmail: vi.fn().mockReturnValue({ subject: "Verify", html: "<p>v</p>" }),
}));
vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: () => "mock-token" }) },
}));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../../verify-email/route");

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => {
    prismaMock.verificationToken.findUnique.mockReset();
    prismaMock.verificationToken.delete.mockReset();
    prismaMock.user.update.mockReset();
  });

  it("returns 400 when token is missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/verify-email");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/verify-email?token=bad");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for expired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "expired",
      type: "EMAIL_VERIFY",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/verify-email?token=expired");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(400);
    expect(body.error).toContain("expired");
  });

  it("returns 200 and verifies user on valid token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "valid",
      type: "EMAIL_VERIFY",
      userId: "u1",
      expiresAt: new Date(Date.now() + 100000),
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/verify-email?token=valid");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailVerified: true } })
    );
  });

  it("deletes token after verification", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "t1",
      token: "valid",
      type: "EMAIL_VERIFY",
      userId: "u1",
      expiresAt: new Date(Date.now() + 100000),
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.verificationToken.delete.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/verify-email?token=valid");
    await GET(req);
    expect(prismaMock.verificationToken.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});

describe("POST /api/auth/verify-email", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.verificationToken.deleteMany.mockReset();
    prismaMock.verificationToken.create.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/verify-email", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/verify-email", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 400 when already verified", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: true, firstName: "A", email: "a@b.com" });
    const req = createRequest("http://localhost:3000/api/auth/verify-email", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 200 and sends verification email", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: false, firstName: "A", email: "a@b.com" });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({});
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/verify-email", { method: "POST" });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });
});
