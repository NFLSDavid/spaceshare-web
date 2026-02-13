import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // No adapter — we manage users manually for full control
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱和密码");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("邮箱或密码错误");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("邮箱或密码错误");
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: profile.email,
                firstName: (profile as any).given_name || profile.name?.split(" ")[0] || "",
                lastName: (profile as any).family_name || profile.name?.split(" ").slice(1).join(" ") || "",
                photoUrl: (profile as any).picture || null,
              },
            });
          }
        } catch (error) {
          console.error("Google signIn callback error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // On initial sign-in, populate token from DB
      if (account) {
        let dbUser;

        if (account.provider === "google" && profile?.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });
        } else if (user?.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.isAdmin = dbUser.isAdmin;
          token.isVerified = dbUser.isVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isVerified = token.isVerified as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
