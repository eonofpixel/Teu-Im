"use client";

import { useState, useEffect, useRef } from "react";

interface ReleaseAsset {
  platform: string;
  filename: string;
  download_url: string;
  size_bytes: number;
}

interface Release {
  version: string;
  assets: ReleaseAsset[];
}

export function DownloadDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRelease = async () => {
      try {
        const res = await fetch("/api/releases/latest");
        if (res.ok) {
          const data = await res.json();
          setRelease(data.release);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchRelease();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const macAsset = release?.assets.find(a => a.platform === "macos-arm");
  const winAsset = release?.assets.find(a => a.platform === "windows");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3.5 text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        앱 다운로드
        <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-64 rounded-xl border border-gray-700 bg-gray-800 shadow-xl shadow-black/30 overflow-hidden z-50">
          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : !release ? (
            <div className="px-4 py-4 text-center text-sm text-gray-500">
              릴리스 정보를 불러올 수 없습니다
            </div>
          ) : (
            <div className="py-2">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-700">
                v{release.version}
              </div>

              {/* macOS */}
              <a
                href={macAsset?.download_url || "/download"}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">macOS</div>
                  <div className="text-xs text-gray-500">Apple Silicon (M1/M2/M3)</div>
                </div>
                {macAsset && (
                  <span className="text-xs text-gray-600">{Math.round(macAsset.size_bytes / 1024 / 1024)}MB</span>
                )}
              </a>

              {/* Windows */}
              <a
                href={winAsset?.download_url || "/download"}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">Windows</div>
                  <div className="text-xs text-gray-500">64-bit (x86_64)</div>
                </div>
                {winAsset && (
                  <span className="text-xs text-gray-600">{Math.round(winAsset.size_bytes / 1024 / 1024)}MB</span>
                )}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
