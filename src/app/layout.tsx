import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pen Fight Arena",
  description:
    "A classroom pen-fighting game with physics-driven play and AI opponents.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#20231f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- This App Router root head loads the same font stylesheet used by the supplied HTML reference. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Schibsted+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Patrick+Hand&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
