import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdapterSend = vi.fn();

vi.mock("../email/adapter", () => ({
  emailAdapter: { send: mockAdapterSend },
}));

// Import after mock
const { sendEmail } = await import("../email/sender");

describe("sendEmail (email.ts)", () => {
  beforeEach(() => {
    mockAdapterSend.mockReset();
  });

  it("calls adapter.send with correct parameters", async () => {
    mockAdapterSend.mockResolvedValue(undefined);
    await sendEmail("test@example.com", "Subject", "<p>Body</p>");
    expect(mockAdapterSend).toHaveBeenCalledWith(
      "test@example.com",
      "Subject",
      "<p>Body</p>",
    );
  });

  it("does not throw on adapter failure", async () => {
    mockAdapterSend.mockRejectedValue(new Error("SMTP error"));
    await expect(
      sendEmail("test@example.com", "Subject", "<p>Body</p>"),
    ).resolves.not.toThrow();
  });

  it("calls adapter.send exactly once per invocation", async () => {
    mockAdapterSend.mockResolvedValue(undefined);
    await sendEmail("a@b.com", "S", "H");
    expect(mockAdapterSend).toHaveBeenCalledTimes(1);
  });

  it("logs error on adapter failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAdapterSend.mockRejectedValue(new Error("fail"));
    await sendEmail("a@b.com", "S", "H");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

