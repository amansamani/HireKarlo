import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL("https://berozgaar-amansamanis-projects.vercel.app"),
  title: {
    default: "HireTrack — AI-powered hiring pipeline",
    template: "%s | HireTrack",
  },
  description: "Post a job, share one link, and let HireTrack parse and score every applicant's resume automatically — a lightweight ATS for recruiters who want to hire faster.",
  openGraph: {
    title: "HireTrack — AI-powered hiring pipeline",
    description: "Post a job, share one link, and let HireTrack parse and score every applicant's resume automatically.",
    url: "https://berozgaar-amansamanis-projects.vercel.app",
    siteName: "HireTrack",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "HireTrack — AI-powered hiring pipeline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HireTrack — AI-powered hiring pipeline",
    description: "Post a job, share one link, and let HireTrack parse and score every applicant's resume automatically.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        {children}
        <Toaster theme="dark" position="top-right" closeButton richColors />
      </body>
    </html>
  );
}