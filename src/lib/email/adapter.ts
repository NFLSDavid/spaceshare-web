import nodemailer from "nodemailer";

/**
 * Adapter Pattern: EmailAdapter interface decouples email-sending logic
 * from any specific provider (Nodemailer, SendGrid, AWS SES, etc.).
 *
 * To switch providers: implement EmailAdapter in a new class, then add a
 * one-line entry to adapterRegistry — zero changes needed elsewhere.
 */
export interface EmailAdapter {
  send(to: string, subject: string, html: string): Promise<void>;
}

// ─── Concrete Adapters ────────────────────────────────────────────────────────

/**
 * Production adapter: sends via SMTP using Nodemailer.
 */
export class NodemailerAdapter implements EmailAdapter {
  private readonly from: string;

  constructor(private readonly transporter: nodemailer.Transporter) {
    this.from = process.env.SMTP_FROM || "SpaceShare <noreply@spaceshare.com>";
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}

/**
 * Development/test adapter: logs email to console instead of sending.
 * Prevents accidental real emails in non-production environments.
 */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(to: string, subject: string, _html: string): Promise<void> {
    console.log(`[Email] To: ${to} | Subject: ${subject}`);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Registry-based Factory: maps provider keys to factory functions.
 *
 * Adding a new provider (e.g. SendGrid):
 *   1. Implement EmailAdapter → class SendGridAdapter { ... }
 *   2. Add one entry: adapterRegistry["sendgrid"] = () => new SendGridAdapter(...)
 *   3. Set EMAIL_PROVIDER=sendgrid in your environment.
 *   — No other changes needed.
 */
const adapterRegistry: Record<string, () => EmailAdapter> = {
  console: () => new ConsoleEmailAdapter(),
  smtp: () =>
    new NodemailerAdapter(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }),
    ),
};

/** Resolves the active provider key from environment variables. */
function resolveProvider(): string {
  if (process.env.EMAIL_PROVIDER) return process.env.EMAIL_PROVIDER;
  return process.env.NODE_ENV === "production" ? "smtp" : "console";
}

/**
 * Creates an EmailAdapter for the active provider.
 * Throws immediately if the provider key is unrecognised, preventing silent
 * misconfigurations from reaching production.
 */
export function createEmailAdapter(): EmailAdapter {
  const provider = resolveProvider();
  const factory = adapterRegistry[provider];
  if (!factory) {
    const valid = Object.keys(adapterRegistry).join(", ");
    throw new Error(
      `[EmailAdapter] Unknown provider "${provider}". Valid options: ${valid}`,
    );
  }
  return factory();
}

export const emailAdapter: EmailAdapter = createEmailAdapter();
