import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic, Caveat, Kalam } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${zen.variable} ${caveat.variable} ${kalam.variable} antialiased`}>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
