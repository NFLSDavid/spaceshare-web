import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiError } from "@/lib/api-utils";
import { validatePassword } from "@/lib/validators";
import { userRepository, verificationTokenRepository } from "@/lib/repositories";
import "@/lib/events/observers"; // register all observers (idempotent via ESM cache)
import { eventBus } from "@/lib/events/bus";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export const authService = {
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const passwordCheck = validatePassword(data.password);
    if (!passwordCheck.valid) {
      throw new ApiError(400, passwordCheck.message);
    }

    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
    });

    const token = generateToken();
    await verificationTokenRepository.create({
      userId: user.id,
      token,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
    eventBus.emit("user.registered", {
      email: data.email,
      firstName: data.firstName,
      verifyUrl,
    });

    return { message: "User created successfully. Please check your email to verify.", userId: user.id };
  },

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);

    if (user) {
      await verificationTokenRepository.deleteByUserAndType(user.id, "PASSWORD_RESET");

      const token = generateToken();
      await verificationTokenRepository.create({
        userId: user.id,
        token,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
      eventBus.emit("user.forgot_password", {
        email: user.email,
        firstName: user.firstName,
        resetUrl,
      });
    }

    return { message: "If an account exists with that email, a reset link has been sent." };
  },

  async resetPassword(token: string, password: string) {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new ApiError(400, passwordCheck.message);
    }

    const verificationToken = await verificationTokenRepository.findByToken(token);
    if (!verificationToken || verificationToken.type !== "PASSWORD_RESET") {
      throw new ApiError(400, "Invalid or expired token");
    }

    if (verificationToken.expiresAt < new Date()) {
      await verificationTokenRepository.delete(verificationToken.id);
      throw new ApiError(400, "Token expired");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await userRepository.update(verificationToken.userId, { password: hashedPassword });
    await verificationTokenRepository.delete(verificationToken.id);

    return { message: "Password reset successfully" };
  },

  async sendVerificationEmail(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.emailVerified) throw new ApiError(400, "Email already verified");

    await verificationTokenRepository.deleteByUserAndType(user.id, "EMAIL_VERIFY");

    const token = generateToken();
    await verificationTokenRepository.create({
      userId: user.id,
      token,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
    eventBus.emit("user.verification_requested", {
      email: user.email,
      firstName: user.firstName,
      verifyUrl,
    });

    return { message: "Verification email sent" };
  },

  async verifyEmail(token: string) {
    if (!token) throw new ApiError(400, "Token required");

    const verificationToken = await verificationTokenRepository.findByToken(token);
    if (!verificationToken || verificationToken.type !== "EMAIL_VERIFY") {
      throw new ApiError(400, "Invalid token");
    }

    if (verificationToken.expiresAt < new Date()) {
      await verificationTokenRepository.delete(verificationToken.id);
      throw new ApiError(400, "Token expired");
    }

    await userRepository.update(verificationToken.userId, { emailVerified: true });
    await verificationTokenRepository.delete(verificationToken.id);

    return { message: "Email verified successfully" };
  },
};
