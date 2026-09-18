import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  outputFileTracingIncludes: { "/*": ["./scripts/parse-resume-worker.mjs", "./node_modules/pdf-parse/**/*", "./node_modules/mammoth/**/*"] },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }, ...["/dashboard/:path*", "/api/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/track", "/rate-interview", "/accept-invite"].map(source => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }))];
  },
};

export default nextConfig;
