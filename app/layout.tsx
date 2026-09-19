import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { AnalyticsConsent } from "@/components/privacy/analytics-consent";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")),
  title: {
    default: "HireKarlo — The Art of Hiring",
    template: "%s | HireKarlo",
  },
  description:
    "Elevate your hiring process. HireKarlo brings elegance and precision to recruiting for teams who appreciate the finer details.",
  openGraph: {
    title: "HireKarlo — The Art of Hiring",
    description: "Elevate your hiring process with elegant, precise recruiting tools.",
    url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    siteName: "HireKarlo",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HireKarlo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HireKarlo — The Art of Hiring",
    description: "Elevate your hiring process with elegant, precise recruiting tools.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Bodoni Moda - elegant serif similar to Bodoni/Didot */}
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400;1,6..96,500&display=swap" rel="stylesheet" />
        {/* Alex Brush - ornate script similar to Bickham Script Pro */}
        <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" closeButton richColors
          toastOptions={{ classNames: { toast: "border border-border bg-popover text-popover-foreground" } }} />
        <AnalyticsConsent />
      </body>
    </html>
  );
}