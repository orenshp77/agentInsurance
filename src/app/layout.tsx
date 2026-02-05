import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["latin", "hebrew"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "מגן פיננסי - ניהול תיק חכם",
  description: "מערכת לניהול תיקי ביטוח ופיננסים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body
        className={`${assistant.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-assistant), sans-serif', overscrollBehaviorX: 'none', touchAction: 'pan-y' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
