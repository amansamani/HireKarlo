import { Toaster } from "sonner";
import "./globals.css";
import { Geist, Space_Grotesk, Caveat } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { AnalyticsConsent } from "@/components/privacy/analytics-consent";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL((process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")),
  title: {
    default: "HireKarlo — AI-powered hiring workspace for recruiters & agencies",
    template: "%s | HireKarlo",
  },
  description:
    "Built for recruiters, agencies and hiring managers. Post a job, review resumes, schedule interviews and track every candidate in one beautifully organized 3D workspace.",
  openGraph: {
    title: "HireKarlo — AI-powered hiring workspace for recruiters & agencies",
    description:
      "Post a job, share one link, and let HireKarlo organize applications with optional AI resume review.",
    url: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
    siteName: "HireKarlo",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HireKarlo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HireKarlo — AI-powered hiring workspace for recruiters & agencies",
    description: "Post a job, share one link, and let HireKarlo organize applications with optional AI resume review.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c0d10" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable, spaceGrotesk.variable, caveat.variable)}>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" closeButton richColors
          toastOptions={{ classNames: { toast: "border border-border bg-popover text-popover-foreground" } }} />
        <AnalyticsConsent />
      </body>
    </html>
  );
}