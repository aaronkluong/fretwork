import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://guitar-capstone.kobbyhanson.workers.dev"),
  title: "Fretwork - Music Intelligence",
  description: "Optimized guitar tablature and harmonic analysis powered by music theory and machine learning.",
  openGraph: {
    title: "Fretwork - Music Intelligence",
    description: "Optimized guitar tablature and harmonic analysis powered by music theory and machine learning.",
    url: "https://guitar-capstone.kobbyhanson.workers.dev",
    siteName: "Fretwork",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fretwork - Music Intelligence",
    description: "Optimized guitar tablature and harmonic analysis powered by music theory and machine learning.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
