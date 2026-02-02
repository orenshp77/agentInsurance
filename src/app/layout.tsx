import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { SessionProvider } from "next-auth/react";
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
      <body
        className={`${assistant.variable} font-sans antialiased`}
        style={{ fontFamily: 'var(--font-assistant), sans-serif' }}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
