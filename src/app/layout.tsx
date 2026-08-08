import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/**
 * Inter carries the whole UI. It is picked for the money columns rather than
 * the headings: `tnum` gives every digit the same advance width, which is what
 * keeps the ARI grid and the folio totals from jittering as rates change.
 */
const sans = Inter({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-loaded",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "STAYBASE — Property Management System",
    template: "%s · STAYBASE",
  },
  description:
    "STAYBASE is a modern property management system for independent hotels and villas, with native Channex channel-manager connectivity.",
  applicationName: "STAYBASE",
  keywords: ["PMS", "hotel software", "channel manager", "Channex", "revenue management"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1f26" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
