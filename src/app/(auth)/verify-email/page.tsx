"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("An error occurred during verification.");
      }
    }

    verify();
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-8 pb-8 text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-600">SpaceShare</h1>
        </div>

        {status === "loading" && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-semibold text-green-700">Email Verified!</h2>
            <p className="text-gray-600">{message}</p>
            <Link href="/login">
              <Button className="w-full mt-4">Sign In</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold text-red-700">Verification Failed</h2>
            <p className="text-gray-600">{message}</p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-4">Back to Sign In</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
        </CardContent>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
