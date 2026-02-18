import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email/sender", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/email/templates", () => ({
  passwordResetEmail: vi.fn().mockReturnValue({ subject: "Reset", html: "<p>reset</p>" }),
}));
vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: () => "reset-token" }) },
}));

import { sendEmail } from "@/lib/email/sender";
const { POST } = await import("../../forgot-password/route");

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.verificationToken.deleteMany.mockReset();
    prismaMock.verificationToken.create.mockReset();
    vi.mocked(sendEmail).mockReset();
  });

  it("returns 400 when email is missing", async () => {
    const req = createRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns 200 even for non-existent user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: { email: "nonexistent@test.com" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
  });

  it("does not send email for non-existent user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: { email: "nonexistent@test.com" },
    });
    await POST(req);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("creates token and sends email when user exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", firstName: "A", email: "a@b.com" });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({});
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: { email: "a@b.com" },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(200);
    expect(prismaMock.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", type: "PASSWORD_RESET" }),
      })
    );
    expect(sendEmail).toHaveBeenCalled();
  });

  it("deletes existing reset tokens before creating new", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", firstName: "A", email: "a@b.com" });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({});
    prismaMock.verificationToken.create.mockResolvedValue({});
    const req = createRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: { email: "a@b.com" },
    });
    await POST(req);
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "u1", type: "PASSWORD_RESET" }),
      })
    );
  });
});
