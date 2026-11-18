import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic, Caveat, Kalam } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PerfOffer } from "@/components/PerfOffer";
import { BASE_PATH } from "@/lib/asset";
import "./globals.css";

const zen = Zen_Maru_Gothic({
  variable: "--font-zen",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dhvani",
  description:
    "A hand drawn noise machine. Stack rain, fire, wind and generated music, and leave it running for as long as you need it.",
  icons: { icon: `${BASE_PATH}/brand/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#f7f2e7",
  // Let the page reach under a notch, then pad it back with safe-area insets.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Deliberately no maximumScale: pinch zoom is an accessibility feature and
  // blocking it to stop an input-focus zoom is not a trade worth making.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${zen.variable} ${caveat.variable} ${kalam.variable} antialiased`}>
        <ThemeProvider />
        {children}
        <PerfOffer />
        {/* Toggling a sound changes a colour and starts a fade. Neither is
            perceivable without sight, so say what happened. */}
        <div id="dhvani-live" role="status" aria-live="polite" className="sr-only" />
      </body>
    </html>
  );
}
