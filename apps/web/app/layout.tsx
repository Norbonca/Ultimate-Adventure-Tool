import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Ultimate Adventure Tool",
  description:
    "Tervezd meg a tökéletes kalandot — túrák szervezése, költségmegosztás, helyi túravezetők",
  keywords: [
    "adventure",
    "túra",
    "kaland",
    "utazás",
    "költségmegosztás",
    "túravezető",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
