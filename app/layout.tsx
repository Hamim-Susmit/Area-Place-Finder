import "leaflet/dist/leaflet.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Area Place Finder",
  description: "Find restaurants and medical centers near any location."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
