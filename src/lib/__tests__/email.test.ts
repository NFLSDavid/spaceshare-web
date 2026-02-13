import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mockSendMail }),
  },
}));

// Import after mock
const { sendEmail } = await import("../email");

describe("sendEmail (email.ts)", () => {
  beforeEach(() => {
    mockSendMail.mockReset();
  });

  it("calls sendMail with correct parameters", async () => {
    mockSendMail.mockResolvedValue({ messageId: "123" });
    await sendEmail("test@example.com", "Subject", "<p>Body</p>");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Subject",
        html: "<p>Body</p>",
      })
    );
  });

  it("does not throw on sendMail failure", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP error"));
    await expect(
      sendEmail("test@example.com", "Subject", "<p>Body</p>")
    ).resolves.not.toThrow();
  });

  it("calls sendMail exactly once per invocation", async () => {
    mockSendMail.mockResolvedValue({});
    await sendEmail("a@b.com", "S", "H");
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("logs error on failure", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendMail.mockRejectedValue(new Error("fail"));
    await sendEmail("a@b.com", "S", "H");
    expect(consoleSpy).toHaveBeenCalled();
  });
});
