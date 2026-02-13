import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("hashed-pw") } }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  emailVerificationEmail: vi.fn().mockReturnValue({ subject: "Verify", html: "<p>verify</p>" }),
}));
vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: () => "mock-token" }) },
}));

const { POST } = await import("../../register/route");

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.verificationToken.create.mockReset();
  });

  it("returns 400 for missing firstName", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { lastName: "B", email: "a@b.com", password: "StrongP@ss1!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for missing email", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", password: "StrongP@ss1!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "not-email", password: "StrongP@ss1!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 400 for weak password", async () => {
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "a@b.com", password: "123456" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 409 for duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "exists@b.com", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(409);
  });

  it("returns 201 on successful registration", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new-user-id", email: "a@b.com" });
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "Alice", lastName: "Smith", email: "alice@test.com", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.userId).toBe("new-user-id");
  });

  it("creates verification token on success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1", email: "a@b.com" });
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "a@b.com", password: "Str0ngP@ss!" },
    });
    await POST(req);
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "EMAIL_VERIFY" }),
      })
    );
  });

  it("hashes the password", async () => {
    const bcrypt = await import("bcryptjs");
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1" });
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "a@b.com", password: "Str0ngP@ss!" },
    });
    await POST(req);
    expect(bcrypt.default.hash).toHaveBeenCalledWith("Str0ngP@ss!", 12);
  });

  it("returns 500 on unexpected error", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));
    const req = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "a@b.com", password: "Str0ngP@ss!" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });
});
