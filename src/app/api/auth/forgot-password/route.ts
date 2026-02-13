import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Delete existing reset tokens for this user
      await prisma.verificationToken.deleteMany({
        where: { userId: user.id, type: "PASSWORD_RESET" },
      });

      const token = crypto.randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token,
          type: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const emailContent = passwordResetEmail(user.firstName, resetUrl);
      sendEmail(user.email, emailContent.subject, emailContent.html);
    }

    return NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
