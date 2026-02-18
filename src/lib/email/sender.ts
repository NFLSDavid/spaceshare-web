import { emailAdapter } from "./adapter";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  try {
    await emailAdapter.send(to, subject, html);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
