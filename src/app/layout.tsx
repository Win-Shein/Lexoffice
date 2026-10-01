import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getLocale } from "@/lib/i18n/server";

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
  title: "MMXeron – Rechnungen & Buchhaltung",
  description:
    "Rechnungs- und Buchhaltungssoftware für den deutschen Markt (UStG §14, GoBD, §19 UStG).",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors theme="system" />
      </body>
    </html>
  );
}
