import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA 설정: service worker를 수동으로 관리
  // next-pwa 대신 수동 SW 접근 (최소 의존성)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // PWA 관련 캐싱 헤더
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // API 및 동적 라우트는 캐시하지 않음
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  // 외부 이미지 등 리소스를 위한 설정
  images: {
    formats: ["image/webp"],
  },
  // 타입스크립트 빌드 시 엄격 모드
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
