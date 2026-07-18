import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

export const proxy = auth((req) => {
  
  const isLoggedIn = !!req.auth?.user?.id;
  const path = req.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");
  const isPublicPath = PUBLIC_PATHS.includes(path);

  if (isAuthPage) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", req.nextUrl));
    }
    return null;
  }

  if (isPublicPath) {
    return null;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|jobs|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff|woff2|ttf|map)$).*)",
  ],
};