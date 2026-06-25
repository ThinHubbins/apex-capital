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
  title: {
    default: "Apex Capital",
    template: "%s | Apex Capital",
  },
  description:
    "Build long-term wealth through simple, global investing. Access major markets with professional tools designed for clarity and speed.",
  keywords: ["investing", "stocks", "ETFs", "global markets", "portfolio", "trading"],
  authors: [{ name: "Apex Capital" }],
  creator: "Apex Capital",
  metadataBase: new URL("https://your-app.onrender.com"), // 👈 replace with your real URL
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-app.onrender.com",
    siteName: "Apex Capital",
    title: "Apex Capital — Invest Beyond Borders",
    description:
      "Build long-term wealth through simple, global investing. Access major markets with professional tools designed for clarity and speed.",
    images: [
      {
        url: "/og-image.png", // add a 1200×630 image to /public
        width: 1200,
        height: 630,
        alt: "Apex Capital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apex Capital — Invest Beyond Borders",
    description:
      "Build long-term wealth through simple, global investing. Access major markets with professional tools designed for clarity and speed.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
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
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}