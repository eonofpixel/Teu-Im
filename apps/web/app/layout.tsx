import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { WebVitals } from "@/components/WebVitals";
import { validateEnv } from "@/lib/env";

// Validate environment variables at application startup
validateEnv();

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Teu-Im",
  description: "실시간 실제 통역 관리 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body
        className={`${inter.variable} min-h-screen bg-gray-950 text-gray-100 antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <ServiceWorkerRegistrar />
        <WebVitals />
      </body>
    </html>
  );
}
