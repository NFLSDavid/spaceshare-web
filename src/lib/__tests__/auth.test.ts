import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: any) => config),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config: any) => config),
}));

import bcrypt from "bcryptjs";
const { authOptions } = await import("../auth");

// Extract callbacks and authorize function
const credentialsProvider = authOptions.providers.find(
  (p: any) => p.name === "credentials"
) as any;
const authorize = credentialsProvider.authorize;
const { signIn, jwt, session } = authOptions.callbacks!;

describe("CredentialsProvider authorize", () => {
  beforeEach(() => {
    vi.mocked(prismaMock.user.findUnique).mockReset();
    vi.mocked(bcrypt.compare).mockReset();
  });

  it("throws when email is missing", async () => {
    await expect(authorize({ email: "", password: "pass" }, {} as any)).rejects.toThrow();
  });

  it("throws when password is missing", async () => {
    await expect(authorize({ email: "a@b.com", password: "" }, {} as any)).rejects.toThrow();
  });

  it("throws when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(
      authorize({ email: "a@b.com", password: "pass123" }, {} as any)
    ).rejects.toThrow();
  });

  it("throws when password is wrong", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      password: "hashed",
      firstName: "A",
      lastName: "B",
      isAdmin: false,
      isVerified: 0,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    await expect(
      authorize({ email: "a@b.com", password: "wrong" }, {} as any)
    ).rejects.toThrow();
  });

  it("returns user on successful login", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      password: "hashed",
      firstName: "Alice",
      lastName: "Smith",
      isAdmin: false,
      isVerified: 1,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    const result = await authorize({ email: "a@b.com", password: "correct" }, {} as any);
    expect(result).toEqual(
      expect.objectContaining({ id: "1", email: "a@b.com", firstName: "Alice" })
    );
  });
});

describe("signIn callback", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
  });

  it("creates new user for Google sign-in if not existing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "new" });
    const result = await signIn!({
      user: { id: "g1", email: "g@test.com" } as any,
      account: { provider: "google" } as any,
      profile: { email: "g@test.com", name: "Google User", given_name: "Google", family_name: "User" } as any,
      credentials: undefined,
    });
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("skips creation for existing Google user", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
    const result = await signIn!({
      user: { id: "g1" } as any,
      account: { provider: "google" } as any,
      profile: { email: "existing@test.com" } as any,
      credentials: undefined,
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("returns true for credentials provider", async () => {
    const result = await signIn!({
      user: { id: "1" } as any,
      account: { provider: "credentials" } as any,
      profile: undefined,
      credentials: undefined,
    });
    expect(result).toBe(true);
  });
});

describe("jwt callback", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
  });

  it("populates token from DB on initial sign-in", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      isAdmin: true,
      isVerified: 1,
    });
    const token = await jwt!({
      token: {} as any,
      user: { email: "a@b.com" } as any,
      account: { provider: "credentials" } as any,
      profile: undefined,
      trigger: "signIn",
    });
    expect(token.id).toBe("u1");
    expect(token.isAdmin).toBe(true);
  });

  it("passes through token on subsequent calls (no account)", async () => {
    const existing = { id: "u1", email: "e", firstName: "F", lastName: "L", isAdmin: false, isVerified: 0 };
    const token = await jwt!({
      token: existing as any,
      user: undefined as any,
      account: null,
      profile: undefined,
      trigger: "update",
    });
    expect(token).toEqual(existing);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("session callback", () => {
  it("copies token fields to session.user", async () => {
    const token = { id: "u1", email: "e@e.com", firstName: "F", lastName: "L", isAdmin: true, isVerified: 2 };
    const sess = { user: { id: "", email: "", firstName: "", lastName: "", isAdmin: false, isVerified: 0 }, expires: "" };
    const result = await session!({
      session: sess as any,
      token: token as any,
      user: undefined as any,
      trigger: "update",
      newSession: undefined,
    });
    expect(result.user.id).toBe("u1");
    expect(result.user.isAdmin).toBe(true);
    expect(result.user.firstName).toBe("F");
  });
});
