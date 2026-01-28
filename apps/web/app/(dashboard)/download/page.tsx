"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

// ─── 타입 정의 ────────────────────────────────────────────

interface ReleaseAsset {
  platform: "macos-arm" | "macos-intel" | "windows" | "linux";
  filename: string;
  download_url: string;
  size_bytes: number;
  checksum?: string; // SHA256 해시
}

interface Release {
  version: string;
  released_at: string;
  assets: ReleaseAsset[];
  release_notes: string;
}

type PlatformId = "macos-arm" | "macos-intel" | "windows" | "linux";
type DetectedPlatform = "macos" | "windows" | "linux";

// ─── 아이콘 컴포넌트 ──────────────────────────────────────

function AppleIcon({ size = "w-7 h-7" }: { size?: string }) {
  return (
    <svg className={`${size} text-gray-300`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon({ size = "w-7 h-7" }: { size?: string }) {
  return (
    <svg className={`${size} text-gray-300`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
    </svg>
  );
}

function LinuxIcon({ size = "w-7 h-7" }: { size?: string }) {
  return (
    <svg className={`${size} text-gray-300`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-3.5 5C7.6 7 6 8.6 6 10.5V14h2v-3.5C8 9.7 9.7 8 11.5 8h1C14.3 8 16 9.7 16 11.5V14h2v-3.5C18 8.6 16.4 7 14.5 7h-6zM4 16v2h16v-2H4z" />
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
    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ─── SHA256 체크섬 배지 (접기/펼치기 + 복사) ─────────────────

function ChecksumBadge({ checksum }: { checksum: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        SHA256
      </button>

      {expanded && (
        <div className="flex items-center gap-2 mt-1.5 pl-4.5">
          <span className="font-mono text-[10px] text-gray-500 break-all leading-tight">
            {checksum}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            title="복사"
          >
            {copied ? (
              <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-3 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 유틸 함수 ────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReleaseDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function detectUserPlatform(): DetectedPlatform {
  if (typeof navigator === "undefined") return "macos";
  const platform = navigator.platform.toLowerCase();

  if (platform.includes("mac") || platform.includes("darwin")) {
    return "macos";
  }
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "macos";
}

// ─── 플랫폼 메타 정의 ─────────────────────────────────────

const PLATFORM_META: Record<
  PlatformId,
  { name: string; subtitle: string; note?: string; requirements: string[] }
> = {
  "macos-arm": {
    name: "macOS ARM",
    subtitle: "Apple Silicon (M1/M2/M3)",
    note: "M1 이후 출시된 Mac에 적합",
    requirements: ["macOS 12 (Monterey) 이상", "Apple M1 칩 이상"],
  },
  "macos-intel": {
    name: "macOS Intel",
    subtitle: "Intel 기반 Mac",
    note: "Intel 프로세서를 사용하는 기존 Mac에 적합",
    requirements: ["macOS 12 (Monterey) 이상", "Intel Core i5 이상"],
  },
  windows: {
    name: "Windows",
    subtitle: "64-bit (x86_64)",
    requirements: ["Windows 10 이상 (64비트)", "4GB 이상 RAM"],
  },
  linux: {
    name: "Linux",
    subtitle: "64-bit (x86_64)",
    requirements: ["Ubuntu 20.04 / Debian 11 이상", "4GB 이상 RAM"],
  },
};

const PLATFORM_ORDER: PlatformId[] = [
  "macos-arm",
  "macos-intel",
  "windows",
  "linux",
];

function PlatformIcon({ id }: { id: PlatformId }) {
  if (id === "macos-arm" || id === "macos-intel") return <AppleIcon />;
  if (id === "windows") return <WindowsIcon />;
  return <LinuxIcon />;
}

// ─── 상수 ─────────────────────────────────────────────────

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
  id,
  asset,
  isRecommended,
  isHighlighted,
}: {
  id: PlatformId;
  asset: ReleaseAsset | null;
  isRecommended: boolean;
  isHighlighted?: boolean;
}) {
  const meta = PLATFORM_META[id];
  const highlighted = isRecommended || isHighlighted;

  return (
    <div
      className={`relative rounded-xl border bg-gray-900 p-5 flex flex-col gap-3 transition-all duration-200 ${
        isRecommended
          ? "border-indigo-600/60 shadow-lg shadow-indigo-500/8 hover:border-indigo-500"
          : highlighted
            ? "border-indigo-600/30 shadow-md shadow-indigo-500/5 hover:border-indigo-600/50"
            : "border-gray-800 hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/5"
      }`}
    >
      {/* 추천 배지 — macOS는 배지 표시하지 않음 */}
      {isRecommended && (
        <div className="absolute -top-px left-4 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 bg-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white">
            <StarIcon />
            권장
          </span>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 ${
            highlighted ? "bg-indigo-600/15 ring-1 ring-indigo-600/30" : "bg-gray-800"
          }`}
        >
          <PlatformIcon id={id} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{meta.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{meta.subtitle}</p>
          {meta.note && (
            <p className="text-xs text-gray-600 mt-1">{meta.note}</p>
          )}
        </div>
      </div>

      {/* 파일 크기 & 체크섬 */}
      {asset && (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-600">파일 크기</span>
            <span className="text-xs font-medium text-gray-400">
              {formatFileSize(asset.size_bytes)}
            </span>
          </div>
          {asset.checksum && <ChecksumBadge checksum={asset.checksum} />}
        </div>
      )}

      {/* 시스템 요구사항 */}
      <div className="space-y-1">
        {meta.requirements.map((req) => (
          <div key={req} className="flex items-center gap-1.5">
            <CheckIcon />
            <span className="text-xs text-gray-500">{req}</span>
          </div>
        ))}
      </div>

      {/* 다운로드 버튼 */}
      {asset ? (
        <a
          href={asset.download_url}
          download={asset.filename}
          className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 ${
            highlighted
              ? "bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          <DownloadIcon />
          다운로드
        </a>
      ) : (
        <div className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-600 cursor-not-allowed">
          <DownloadIcon />
          준비 중
        </div>
      )}
    </div>
  );
}

// ─── 릴리스 노트 (접기/펼치기) ────────────────────────────

function ReleaseNotesSection({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!notes.trim()) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-900/50"
      >
        <h2 className="text-sm font-semibold text-white">릴리스 노트</h2>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4">
          <div className="prose prose-sm prose-invert prose-gray max-w-none text-xs text-gray-400 leading-relaxed [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-2 [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-gray-300 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-gray-400 [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_code]:bg-gray-800 [&_code]:text-indigo-300 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_pre]:bg-gray-800 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_a]:text-indigo-400 [&_a]:underline [&_a:hover]:text-indigo-300 [&_strong]:text-gray-300 [&_p]:mb-2 [&_hr]:border-gray-800 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-700 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic">
            <ReactMarkdown>{notes}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 설치 단계 ────────────────────────────────────────────

function InstallStepItem({
  step,
  title,
  description,
  isLast,
}: {
  step: number;
  title: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/15 border border-indigo-600/30">
          <span className="text-xs font-bold text-indigo-400">{step}</span>
        </div>
        {!isLast && <div className="w-px h-full min-h-6 bg-gray-800 mt-1.5" />}
      </div>
      <div className={`${isLast ? "" : "pb-5"}`}>
        <h4 className="text-xs font-semibold text-white">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── 로딩 스켈레톤 ────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl">
      {/* 헤더 스켈레톤 */}
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-gray-800/60 rounded animate-pulse" />
      </div>

      {/* 버전 배지 스켈레톤 */}
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-800 rounded-full animate-pulse" />
      </div>

      {/* 카드 스켈레톤 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
            <div className="flex gap-3.5">
              <div className="h-12 w-12 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-36 bg-gray-800/60 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-20 bg-gray-800/60 rounded animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-40 bg-gray-800/40 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-800/40 rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 빈 상태 (릴리스 없음) ────────────────────────────────

function EmptyReleaseState() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center mb-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 mx-auto mb-4">
        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">아직 릴리스가 없습니다</h3>
      <p className="text-xs text-gray-500 max-w-xs mx-auto">
        첫 번째 릴리스가 준비되면 여기에 다운로드 파일이 등장하겠습니다.
        지금은 웹 버전을 사용해 보세요.
      </p>
    </div>
  );
}

// ─── 오류 상태 ────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center mb-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-900/20 mx-auto mb-3">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">릴리스 정보를 가져올 수 없습니다</h3>
      <p className="text-xs text-gray-500 mb-4">잠시 후 다시 시도해 주세요</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        다시 시도
      </button>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function DownloadPage() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userPlatform, setUserPlatform] = useState<DetectedPlatform>("macos");

  const fetchRelease = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/releases/latest");
      if (!res.ok) throw new Error("API 오류");
      const data = (await res.json()) as { release: Release | null };
      setRelease(data.release);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserPlatform(detectUserPlatform());
    fetchRelease();
  }, []);

  // 로딩 중
  if (loading) return <LoadingSkeleton />;

  // 오류 상태
  if (error) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">다운로드</h1>
          <p className="text-sm text-gray-400 mt-1">
            Teu-Im 데스크탑 앱을 다운로드하여 설치하세요
          </p>
        </div>
        <ErrorState onRetry={fetchRelease} />

        {/* 웹 버전 안내 — 오류 시에도 표시 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 flex-shrink-0">
              <GlobeIcon />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">설치 없이 웹에서 바로 사용하기</h3>
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
      </div>
    );
  }

  // 릴리스 없음
  if (!release) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">다운로드</h1>
          <p className="text-sm text-gray-400 mt-1">
            Teu-Im 데스크탑 앱을 다운로드하여 설치하세요
          </p>
        </div>
        <EmptyReleaseState />

        {/* 웹 버전 안내 */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 flex-shrink-0">
              <GlobeIcon />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">설치 없이 웹에서 바로 사용하기</h3>
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
      </div>
    );
  }

  // asset을 플랫폼별로 맵핑
  const assetMap = new Map<PlatformId, ReleaseAsset>();
  for (const asset of release.assets) {
    assetMap.set(asset.platform, asset);
  }

  return (
    <div className="max-w-4xl">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">다운로드</h1>
        <p className="text-sm text-gray-400 mt-1">
          Teu-Im 데스크탑 앱을 다운로드하여 설치하세요
        </p>
      </div>

      {/* 버전 정보 배지 */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-600/40 bg-indigo-600/10 px-3.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
          <span className="text-xs font-semibold text-indigo-300">v{release.version}</span>
        </span>
        <span className="text-xs text-gray-600">
          {formatReleaseDate(release.released_at)}
        </span>
      </div>

      {/* 플랫폼별 다운로드 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {PLATFORM_ORDER.map((id) => {
          const isMacOSCard = id === "macos-arm" || id === "macos-intel";
          // macOS 사용자: 두 카드 모두 하이라이트 (권장 배지 없음)
          // Windows / Linux: 단일 권장 배지
          const isRecommended =
            !isMacOSCard && (
              (userPlatform === "windows" && id === "windows") ||
              (userPlatform === "linux" && id === "linux")
            );
          const isHighlighted = isMacOSCard && userPlatform === "macos";

          return (
            <PlatformCard
              key={id}
              id={id}
              asset={assetMap.get(id) ?? null}
              isRecommended={isRecommended}
              isHighlighted={isHighlighted}
            />
          );
        })}
      </div>

      {/* 릴리스 노트 (접기/펼치기) */}
      <div className="mb-6">
        <ReleaseNotesSection notes={release.release_notes} />
      </div>

      {/* 웹 버전 안내 sectoin */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 flex-shrink-0">
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

      {/* 설치 가이드 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-0.5">설치 가이드</h2>
        <p className="text-xs text-gray-500 mb-4">간단한 단계별로 안내해 드리겠습니다</p>

        <div className="flex flex-col">
          {INSTALL_STEPS.map((item) => (
            <InstallStepItem
              key={item.step}
              {...item}
              isLast={item.step === INSTALL_STEPS.length}
            />
          ))}
        </div>
      </div>

      {/* 전체 릴리스 목록 링크 */}
      <div className="flex items-center justify-center">
        <a
          href="https://github.com/teu-im/teu-im/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4.942 4.942 0 00-6.824 0l-4 4a4.952 4.952 0 101.414 7.071l2.828-2.828m-.757-1.757a4.942 4.942 0 006.824 0l4-4a4.952 4.952 0 00-1.414-7.071l-2.828 2.828" />
          </svg>
          전체 릴리스 목록 (GitHub)
        </a>
      </div>
    </div>
  );
}
