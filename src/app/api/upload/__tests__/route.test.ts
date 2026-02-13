import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "@/test/helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/cloudinary", () => ({
  uploadImage: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { uploadImage } from "@/lib/cloudinary";
const { POST } = await import("../route");

function createFormDataRequest(
  url: string,
  formData: FormData,
  session: any
) {
  vi.mocked(getServerSession).mockResolvedValue(session);
  return new Request(url, {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    vi.mocked(uploadImage).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const formData = new FormData();
    formData.append("file", new Blob(["test"]), "test.png");
    // Need to use NextRequest with formData
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    const formData = new FormData();
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(400);
  });

  it("returns url on successful upload", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(uploadImage).mockResolvedValue("https://res.cloudinary.com/uploaded.jpg");
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/png" }), "test.png");
    formData.append("folder", "test-folder");
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);
    expect(status).toBe(200);
    expect(body.url).toBe("https://res.cloudinary.com/uploaded.jpg");
  });

  it("returns 500 on upload error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(uploadImage).mockRejectedValue(new Error("Cloudinary error"));
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/png" }), "test.png");
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(500);
  });
});
