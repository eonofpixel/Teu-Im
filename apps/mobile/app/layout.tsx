import React from "react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Teu-Im 통역",
  description: "실시간 통역 참석자 앱 - 회의, 강의, 행사에서 실시간 통역 내용을 확인합니다.",
  // PWA 관련 메타 태그
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Teu-Im",
    statusBarStyle: "black-translucent",
  },
  // Open Graph (소셜 공유)
  openGraph: {
    title: "Teu-Im 통역",
    description: "실시간 통역 참석자 앱",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" dir="ltr">
      <head>
        {/* iOS PWA 홈 스크린 아이콘 및 스플래시 관련 메타 태그 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Teu-Im" />
        <meta name="theme-color" content="#111827" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* PWA 설치 가능성 힌트 — Chrome에서 앱 설치 배너 표시 */}
        <link rel="manifest" href="/manifest.json" />

        {/* 안전 영역 지원 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="min-h-screen text-gray-50 font-sans" style={{ background: "var(--color-bg-primary)" }}>
        {/* 안전 영역 래퍼: status bar & home indicator 영역 보호 */}
        <div className="safe-area-top safe-area-x min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
