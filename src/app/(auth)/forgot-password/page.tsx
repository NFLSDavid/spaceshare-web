"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setSent(true); // Show success regardless to prevent enumeration
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-8 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">SpaceShare</h1>
          <p className="text-gray-500 mt-2">Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <Mail className="h-12 w-12 text-blue-500 mx-auto" />
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-gray-600">
              If an account exists with that email, we've sent a link to reset your password.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-4">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
