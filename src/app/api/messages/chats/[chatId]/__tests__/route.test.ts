import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/test/mocks/prisma";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
const { GET, POST } = await import("../../[chatId]/route");

const mockSession = { user: { id: "u1", firstName: "John", lastName: "Doe" } };
const makeParams = (chatId: string) => ({ params: Promise.resolve({ chatId }) });

describe("GET /api/messages/chats/[chatId]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.chat.findUnique.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/messages/chats/c1");
    const res = await GET(req, makeParams("c1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 404 when chat not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/messages/chats/c1");
    const res = await GET(req, makeParams("c1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(404);
  });

  it("returns 403 when user is not a member", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findUnique.mockResolvedValue({
      id: "c1",
      members: [{ userId: "other-user", user: { id: "other-user" } }],
      messages: [],
    });
    const req = createRequest("http://localhost:3000/api/messages/chats/c1");
    const res = await GET(req, makeParams("c1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns 200 with chat data when user is member", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.chat.findUnique.mockResolvedValue({
      id: "c1",
      members: [
        { userId: "u1", user: { id: "u1", firstName: "John" } },
        { userId: "u2", user: { id: "u2", firstName: "Jane" } },
      ],
      messages: [{ id: "m1", text: "Hello" }],
    });
    const req = createRequest("http://localhost:3000/api/messages/chats/c1");
    const res = await GET(req, makeParams("c1"));
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.id).toBe("c1");
    expect(body.messages).toHaveLength(1);
  });
});

describe("POST /api/messages/chats/[chatId]", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    prismaMock.message.create.mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/messages/chats/c1", {
      method: "POST",
      body: { text: "Hi" },
    });
    const res = await POST(req, makeParams("c1"));
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 201 and creates message", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    prismaMock.message.create.mockResolvedValue({
      id: "m1",
      chatId: "c1",
      senderId: "u1",
      senderName: "John Doe",
      text: "Hello!",
    });
    const req = createRequest("http://localhost:3000/api/messages/chats/c1", {
      method: "POST",
      body: { text: "Hello!" },
    });
    const res = await POST(req, makeParams("c1"));
    const { status, body } = await parseResponse(res);
    expect(status).toBe(201);
    expect(body.text).toBe("Hello!");
    expect(body.senderName).toBe("John Doe");
  });
});
