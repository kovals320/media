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
  description: "התמונות והסרטים של המשפחה במקום אחד",
  robots: { index: false, follow: false },
  applicationName: "המדיה של המשפחה",
  appleWebApp: { capable: true, title: "המדיה", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
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
