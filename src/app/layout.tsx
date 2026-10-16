import type { Metadata, Viewport } from "next";
import { Assistant, Secular_One } from "next/font/google";
import "./globals.css";

const secular = Secular_One({
  weight: "400",
  subsets: ["hebrew", "latin"],
  variable: "--font-secular",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "המדיה של המשפחה",
  description: "התמונות והסרטונים של המשפחה במקום אחד",
};

export const viewport: Viewport = {
  themeColor: "#f6f7f2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${secular.variable} ${assistant.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
