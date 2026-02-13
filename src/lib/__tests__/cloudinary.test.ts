import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockDestroy = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: mockUpload,
      destroy: mockDestroy,
    },
  },
}));

const { uploadImage, deleteImage } = await import("../cloudinary");

describe("uploadImage", () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockDestroy.mockReset();
  });

  it("calls upload with file and default folder", async () => {
    mockUpload.mockResolvedValue({ secure_url: "https://res.cloudinary.com/img.jpg" });
    await uploadImage("data:image/png;base64,abc");
    expect(mockUpload).toHaveBeenCalledWith("data:image/png;base64,abc", {
      folder: "spaceshare",
      transformation: [{ width: 1200, height: 800, crop: "limit" }],
    });
  });

  it("calls upload with custom folder", async () => {
    mockUpload.mockResolvedValue({ secure_url: "https://res.cloudinary.com/img.jpg" });
    await uploadImage("data:image/png;base64,abc", "custom-folder");
    expect(mockUpload).toHaveBeenCalledWith(
      "data:image/png;base64,abc",
      expect.objectContaining({ folder: "custom-folder" })
    );
  });

  it("returns secure_url", async () => {
    mockUpload.mockResolvedValue({ secure_url: "https://res.cloudinary.com/test.jpg" });
    const url = await uploadImage("data:image/png;base64,abc");
    expect(url).toBe("https://res.cloudinary.com/test.jpg");
  });

  it("propagates upload errors", async () => {
    mockUpload.mockRejectedValue(new Error("Upload failed"));
    await expect(uploadImage("bad-data")).rejects.toThrow("Upload failed");
  });
});

describe("deleteImage", () => {
  beforeEach(() => {
    mockDestroy.mockReset();
  });

  it("calls destroy with publicId", async () => {
    mockDestroy.mockResolvedValue({ result: "ok" });
    await deleteImage("folder/image-id");
    expect(mockDestroy).toHaveBeenCalledWith("folder/image-id");
  });
});
