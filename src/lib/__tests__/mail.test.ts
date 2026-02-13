import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mockSendMail }),
  },
}));

const { sendEmail } = await import("../mail");

describe("sendEmail (mail.ts)", () => {
  beforeEach(() => {
    mockSendMail.mockReset();
  });

  it("returns true on success", async () => {
    mockSendMail.mockResolvedValue({ messageId: "abc" });
    const result = await sendEmail("test@test.com", "Subject", "<p>Hi</p>");
    expect(result).toBe(true);
  });

  it("returns false on error", async () => {
    mockSendMail.mockRejectedValue(new Error("Network error"));
    const result = await sendEmail("test@test.com", "Subject", "<p>Hi</p>");
    expect(result).toBe(false);
  });

  it("passes correct params to sendMail", async () => {
    mockSendMail.mockResolvedValue({});
    await sendEmail("to@test.com", "My Subject", "<b>html</b>");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "to@test.com",
        subject: "My Subject",
        html: "<b>html</b>",
      })
    );
  });

  it("logs error on failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendMail.mockRejectedValue(new Error("fail"));
    await sendEmail("a@b.com", "S", "H");
    expect(consoleSpy).toHaveBeenCalled();
  });
});
