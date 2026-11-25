import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppDataProvider } from "@/lib/data/store";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";

const noto = Noto_Sans_KR({ variable: "--font-noto", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Re:Life AI – 인생 2막 설계 AI Agent", template: "%s | Re:Life AI" },
  description: "당신의 경험을 새로운 가능성으로, 인생 2막을 설계하다. 중장년 맞춤 재취업·경력전환·교육·노후 준비 AI Agent.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f6b5c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          본문 바로가기
        </a>
        <AppDataProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </AppDataProvider>
      </body>
    </html>
  );
}
