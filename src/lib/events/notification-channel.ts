import { sendEmail } from "@/lib/email/sender";

/**
 * Strategy Pattern: NotificationChannel defines a unified contract for
 * delivering notifications, decoupled from any specific transport (email,
 * SMS, push, webhook, etc.).
 *
 * To add a new channel: implement NotificationChannel and add an instance
 * to the `notificationChannels` array — zero changes elsewhere.
 */
export interface NotificationChannel {
  readonly name: string;
  send(to: string, subject: string, html: string): Promise<void>;
}

/**
 * Email delivery strategy — current production channel.
 */
class EmailNotificationChannel implements NotificationChannel {
  readonly name = "email";

  async send(to: string, subject: string, html: string): Promise<void> {
    await sendEmail(to, subject, html);
  }
}

/**
 * Future channels — add here without touching notification.service.ts:
 *
 * class SMSNotificationChannel implements NotificationChannel {
 *   readonly name = "sms";
 *   async send(to: string, subject: string, _html: string) {
 *     await twilioClient.messages.create({ to, body: subject, from: ... });
 *   }
 * }
 *
 * class WebhookNotificationChannel implements NotificationChannel {
 *   readonly name = "webhook";
 *   async send(to: string, subject: string, html: string) { ... }
 * }
 */

const notificationChannels: NotificationChannel[] = [
  new EmailNotificationChannel(),
];

/**
 * Dispatches a notification across ALL registered channels.
 * Uses Promise.allSettled so a failure in one channel never blocks others.
 */
export async function dispatchNotification(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const results = await Promise.allSettled(
    notificationChannels.map((ch) => ch.send(to, subject, html)),
  );

  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[Notification] Channel "${notificationChannels[i].name}" failed:`,
        result.reason,
      );
    }
  }
}
