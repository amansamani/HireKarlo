import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import {Pinyon_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const pinyonScript = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-script" });

export const metadata: Metadata = {
  metadataBase: new URL("https://HireKarlo.amansamani.me"),
  title: {
    default: "HireKarlo — AI-powered hiring pipeline",
    template: "%s | HireKarlo",
  },
  description:
    "Post a job, share one link, and let HireKarlo parse and score every applicant's resume automatically — a lightweight ATS for recruiters who want to hire faster.",
  openGraph: {
    title: "HireKarlo — AI-powered hiring pipeline",
    description:
      "Post a job, share one link, and let HireKarlo parse and score every applicant's resume automatically.",
    url: "https://HireKarlo.amansamani.me",
    siteName: "HireKarlo",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "HireKarlo — AI-powered hiring pipeline",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "HireKarlo — AI-powered hiring pipeline",
    description:
      "Post a job, share one link, and let HireKarlo parse and score every applicant's resume automatically.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c0d10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable,  pinyonScript.variable)}>


      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast: "border border-border bg-popover text-popover-foreground",
            },
          }}
        />
        <Analytics />
      </body>
      
    </html>
    
  );
}