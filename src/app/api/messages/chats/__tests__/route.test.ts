import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../route");

const mockSession = { user: { id: "u1", firstName: "John", lastName: "Doe" } };

describe("GET /api/messages/chats", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.chat.findMany.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/messages/chats");
    const res = await GET(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns user chats sorted by last message", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    const now = new Date();
    prismaMock.chat.findMany.mockResolvedValue([
      {
        id: "c1",
        createdAt: new Date(now.getTime() - 10000),
        messages: [{ createdAt: new Date(now.getTime() - 5000) }],
      },
      {
        id: "c2",
        createdAt: new Date(now.getTime() - 20000),
        messages: [{ createdAt: now }],
      },
    ]);
    const req = createRequest("http://localhost:3000/api/messages/chats");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body[0].id).toBe("c2"); // Most recent message
  });

  it("returns chats sorted by createdAt when no messages", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findMany.mockResolvedValue([
      { id: "c1", createdAt: new Date("2025-01-01"), messages: [] },
      { id: "c2", createdAt: new Date("2025-01-02"), messages: [] },
    ]);
    const req = createRequest("http://localhost:3000/api/messages/chats");
    const res = await GET(req);
    const { body } = await parseResponse(res);
    expect(body[0].id).toBe("c2");
  });
});

describe("POST /api/messages/chats", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.chat.findFirst.mockReset();
    prismaMock.chat.create.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/messages/chats", {
      method: "POST",
      body: { title: "Test", memberIds: ["u1", "u2"] },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns existing chat for duplicate", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findFirst.mockResolvedValue({
      id: "existing",
      members: [],
      messages: [],
    });
    const req = createRequest("http://localhost:3000/api/messages/chats", {
      method: "POST",
      body: { title: "Test", listingId: "l1", memberIds: ["u1", "u2"] },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.id).toBe("existing");
  });

  it("creates new chat when no duplicate exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findFirst.mockResolvedValue(null);
    prismaMock.chat.create.mockResolvedValue({
      id: "new-chat",
      members: [],
      messages: [],
    });
    const req = createRequest("http://localhost:3000/api/messages/chats", {
      method: "POST",
      body: { title: "Test", listingId: "l1", memberIds: ["u1", "u2"] },
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.id).toBe("new-chat");
  });
});
