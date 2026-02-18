function layout(content: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #2563eb; margin: 0;">SpaceShare</h1>
      </div>
      ${content}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This is an automated message from SpaceShare. Please do not reply directly.</p>
      </div>
    </div>
  `;
}

export function reservationStatusEmail(
  recipientName: string,
  listingTitle: string,
  status: string,
  dates: { start: string; end: string }
) {
  const statusText = status === "APPROVED" ? "approved" : "declined";
  const statusColor = status === "APPROVED" ? "#16a34a" : "#dc2626";
  return {
    subject: `Reservation ${statusText}: ${listingTitle}`,
    html: layout(`
      <p>Hi ${recipientName},</p>
      <p>Your reservation for <strong>${listingTitle}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Dates:</strong> ${dates.start} - ${dates.end}</p>
      </div>
      ${status === "APPROVED" ? "<p>Your space is confirmed! You can view details in the app.</p>" : "<p>You can search for other available spaces.</p>"}
    `),
  };
}

export function reservationCancelledByClientEmail(
  hostName: string,
  clientName: string,
  listingTitle: string,
  dates: { start: string; end: string }
) {
  return {
    subject: `Reservation cancelled: ${listingTitle}`,
    html: layout(`
      <p>Hi ${hostName},</p>
      <p><strong>${clientName}</strong> has cancelled their reservation for <strong>${listingTitle}</strong>.</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Dates:</strong> ${dates.start} - ${dates.end}</p>
      </div>
      <p>The space is now available for other bookings.</p>
    `),
  };
}

export function newReservationRequestEmail(
  hostName: string,
  clientName: string,
  listingTitle: string,
  space: number,
  dates: { start: string; end: string }
) {
  return {
    subject: `New reservation request: ${listingTitle}`,
    html: layout(`
      <p>Hi ${hostName},</p>
      <p><strong>${clientName}</strong> has requested to reserve space in your listing <strong>${listingTitle}</strong>.</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Space:</strong> ${space} m³</p>
        <p style="margin: 4px 0;"><strong>Dates:</strong> ${dates.start} - ${dates.end}</p>
      </div>
      <p>Log in to SpaceShare to approve or decline this request.</p>
    `),
  };
}

export function newListingMatchEmail(
  userName: string,
  listingTitle: string,
  price: number,
  distance: number,
  address: string
) {
  return {
    subject: `New listing nearby: ${listingTitle}`,
    html: layout(`
      <p>Hi ${userName},</p>
      <p>A new listing matching your preferences is available!</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>${listingTitle}</strong></p>
        <p style="margin: 4px 0;"><strong>Price:</strong> $${price.toFixed(2)} CAD/day per m³</p>
        <p style="margin: 4px 0;"><strong>Distance:</strong> ${distance.toFixed(1)} km away</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${address}</p>
      </div>
      <p>Log in to SpaceShare to view and reserve.</p>
    `),
  };
}

export function emailVerificationEmail(name: string, verifyUrl: string) {
  return {
    subject: "Verify your SpaceShare email",
    html: layout(`
      <p>Hi ${name},</p>
      <p>Welcome to SpaceShare! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Verify Email</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `),
  };
}

export function passwordResetEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset your SpaceShare password",
    html: layout(`
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `),
  };
}
