import { describe, it, expect, vi } from "vitest";
import {
  NodemailerAdapter,
  ConsoleEmailAdapter,
  createEmailAdapter,
} from "../email/adapter";
import type { Transporter } from "nodemailer";

describe("NodemailerAdapter", () => {
  it("delegates send() to nodemailer sendMail with correct params", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "123" });
    const fakeTransporter = { sendMail: mockSendMail } as unknown as Transporter;
    const adapter = new NodemailerAdapter(fakeTransporter);

    await adapter.send("to@test.com", "Hello", "<b>hi</b>");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "to@test.com",
        subject: "Hello",
        html: "<b>hi</b>",
      }),
    );
  });

  it("propagates errors from sendMail", async () => {
    const mockSendMail = vi.fn().mockRejectedValue(new Error("SMTP error"));
    const fakeTransporter = { sendMail: mockSendMail } as unknown as Transporter;
    const adapter = new NodemailerAdapter(fakeTransporter);

    await expect(adapter.send("x@x.com", "S", "H")).rejects.toThrow("SMTP error");
  });
});

describe("ConsoleEmailAdapter", () => {
  it("logs email details without throwing", async () => {
    const adapter = new ConsoleEmailAdapter();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(adapter.send("to@test.com", "Subject", "<p>body</p>")).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("to@test.com"));

    consoleSpy.mockRestore();
  });
});

describe("createEmailAdapter (factory)", () => {
  it("returns ConsoleEmailAdapter when EMAIL_PROVIDER=console", () => {
    vi.stubEnv("EMAIL_PROVIDER", "console");
    const adapter = createEmailAdapter();
    expect(adapter).toBeInstanceOf(ConsoleEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("returns NodemailerAdapter when EMAIL_PROVIDER=smtp", () => {
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    const adapter = createEmailAdapter();
    expect(adapter).toBeInstanceOf(NodemailerAdapter);
    vi.unstubAllEnvs();
  });

  it("falls back to ConsoleEmailAdapter in non-production when EMAIL_PROVIDER is unset", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("EMAIL_PROVIDER", "");
    const adapter = createEmailAdapter();
    expect(adapter).toBeInstanceOf(ConsoleEmailAdapter);
    vi.unstubAllEnvs();
  });

  it("throws for an unrecognised EMAIL_PROVIDER value", () => {
    vi.stubEnv("EMAIL_PROVIDER", "sendgrid");
    expect(() => createEmailAdapter()).toThrow(/Unknown provider "sendgrid"/);
    vi.unstubAllEnvs();
  });

  it("error message lists all valid provider options", () => {
    vi.stubEnv("EMAIL_PROVIDER", "bad-provider");
    expect(() => createEmailAdapter()).toThrow(/console.*smtp|smtp.*console/);
    vi.unstubAllEnvs();
  });
});
