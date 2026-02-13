import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { emailVerificationEmail } from "@/lib/email-templates";
import crypto from "crypto";

// POST: Send verification email
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    // Delete existing verification tokens
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: "EMAIL_VERIFY" },
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    const email = emailVerificationEmail(user.firstName, verifyUrl);
    sendEmail(user.email, email.subject, email.html);

    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Verify email POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Verify the token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.type !== "EMAIL_VERIFY") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    });

    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
