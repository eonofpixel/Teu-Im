"use client";

import Link from "next/link";

// ─── 아이콘 컴포넌트 ──────────────────────────────────────

function AppleIcon() {
  return (
    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm4 0h-2v-2h2v2zm-2-4c-1.66 0-3 1.34-3 3h2c0-.55.45-1 1-1s1 .45 1 1h2c0-1.66-1.34-3-3-3zm-1-6c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm4 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 12a9 9 0 0018 0M9 12c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3zm0 0v-4a3 3 0 016 0v4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── 상수 ─────────────────────────────────────────────────

const GITHUB_RELEASES_URL = "https://github.com/eonofpixel/Teu-Im/releases/latest";

const PLATFORMS = [
  {
    id: "macos-arm",
    name: "macOS",
    subtitle: "Apple Silicon (M1/M2/M3)",
    icon: <AppleIcon />,
    requirements: ["macOS 12 (Monterey) 이상", "Apple M1 칩 이상"],
  },
  {
    id: "macos-intel",
    name: "macOS",
    subtitle: "Intel (x86_64)",
    icon: <AppleIcon />,
    requirements: ["macOS 12 (Monterey) 이상", "Intel Core i5 이상"],
  },
  {
    id: "windows",
    name: "Windows",
    subtitle: "64-bit (x86_64)",
    icon: <WindowsIcon />,
    requirements: ["Windows 10 이상 (64비트)", "4GB 이상 RAM"],
  },
  {
    id: "linux",
    name: "Linux",
    subtitle: "64-bit (x86_64)",
    icon: <LinuxIcon />,
    requirements: ["Ubuntu 20.04 / Debian 11 이상", "4GB 이상 RAM"],
  },
] as const;

const INSTALL_STEPS = [
  {
    step: 1,
    title: "설치파일 다운로드",
    description: "위의 플랫폼에 맞는 다운로드 버튼을 클릭하여 설치파일을 받습니다.",
  },
  {
    step: 2,
    title: "설치파일 실행",
    description: "다운로드된 파일을 더블클릭하여 설치 프로세스를 시작합니다.",
  },
  {
    step: 3,
    title: "로그인 및 API 키 설정",
    description: "앱을 실행한 후 계정에 로그인하고, 설정에서 Soniox API 키를 입력하세요.",
  },
  {
    step: 4,
    title: "프로젝트 생성 및 사용",
    description: "새 프로젝트를 만들어 실시간 음성 통역을 바로 시작할 수 있습니다.",
  },
] as const;

// ─── 플랫폼 카드 ──────────────────────────────────────────

function PlatformCard({
  name,
  subtitle,
  icon,
  requirements,
}: {
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  requirements: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-4 transition-all duration-200 hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/5">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white">{name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* 시스템 요구사항 */}
      <div className="space-y-1.5">
        {requirements.map((req) => (
          <div key={req} className="flex items-center gap-2">
            <CheckIcon />
            <span className="text-xs text-gray-400">{req}</span>
          </div>
        ))}
      </div>

      {/* 다운로드 버튼 */}
      <a
        href={GITHUB_RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        <DownloadIcon />
        다운로드
      </a>
    </div>
  );
}

// ─── 설치 단계 ────────────────────────────────────────────

function InstallStepItem({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      {/* 단계 번호 */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-600/40">
          <span className="text-sm font-bold text-indigo-400">{step}</span>
        </div>
        {step < INSTALL_STEPS.length && (
          <div className="w-px h-full min-h-8 bg-gray-800 mt-2" />
        )}
      </div>

      {/* 내용 */}
      <div className="pb-6">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function DownloadPage() {
  return (
    <div className="max-w-4xl">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">다운로드</h1>
        <p className="text-sm text-gray-400 mt-1">
          Teu-Im 데스크탑 앱을 다운로드하여 설치하세요
        </p>
      </div>

      {/* 플랫폼별 다운로드 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {PLATFORMS.map((platform) => (
          <PlatformCard key={platform.id} {...platform} />
        ))}
      </div>

      {/* 웹 버전 안내 섹션 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800 flex-shrink-0">
            <GlobeIcon />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              설치 없이 웹에서 바로 사용하기
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              다운로드 없이 브라우저에서 곧바로 Teu-Im을 사용할 수 있습니다
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-600 px-4 py-2.5 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-600/10 flex-shrink-0"
        >
          <GlobeIcon />
          웹에서 시작하기
        </Link>
      </div>

      {/* 설치 가이드 섹션 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold text-white mb-1">설치 가이드</h2>
        <p className="text-xs text-gray-500 mb-6">간단한 단계별로 안내해 드리겠습니다</p>

        <div className="flex flex-col">
          {INSTALL_STEPS.map((item) => (
            <InstallStepItem key={item.step} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
