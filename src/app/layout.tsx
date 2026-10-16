import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Media",
  description: "Our family's photos and videos",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
