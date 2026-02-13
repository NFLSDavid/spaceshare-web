import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Admin route protection
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!req.nextauth.token?.isAdmin) {
        return NextResponse.redirect(new URL("/search", req.url));
      }
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/search/:path*",
    "/listings/:path*",
    "/reservations/:path*",
    "/messages/:path*",
    "/profile/:path*",
    "/shortlist/:path*",
    "/admin/:path*",
  ],
};
