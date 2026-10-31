import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Game",
  description: "Gioco di simulazione aziendale multiplayer — demo core loop v0",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Business Game", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
