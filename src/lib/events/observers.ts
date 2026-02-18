/**
 * Observer registrations — import this module once as a side effect to wire up
 * all domain-event handlers. ESM module caching ensures handlers are never
 * registered twice, even if this file is imported from multiple places.
 *
 * Add a new observer here without touching any service file.
 */

import { eventBus } from "./bus";
import { sendEmail } from "@/lib/email/sender";
import {
  emailVerificationEmail,
  passwordResetEmail,
} from "@/lib/email/templates";
import { notificationService } from "@/lib/services/notification.service";

// ─── Auth observers ───────────────────────────────────────────────────────────

function sendVerificationEmail({
  email,
  firstName,
  verifyUrl,
}: {
  email: string;
  firstName: string;
  verifyUrl: string;
}) {
  const { subject, html } = emailVerificationEmail(firstName, verifyUrl);
  return sendEmail(email, subject, html);
}

eventBus.on("user.registered", sendVerificationEmail);
eventBus.on("user.verification_requested", sendVerificationEmail);

eventBus.on("user.forgot_password", ({ email, firstName, resetUrl }) => {
  const { subject, html } = passwordResetEmail(firstName, resetUrl);
  return sendEmail(email, subject, html);
});

// ─── Listing observers ────────────────────────────────────────────────────────

eventBus.on("listing.created", (listing) =>
  notificationService.notifyMatchingPreferences(listing),
);
