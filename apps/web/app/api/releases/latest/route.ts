import { apiSuccess, apiError, ERRORS } from "@/lib/api-response";

// ─── 타입 정의 ────────────────────────────────────────────

interface ReleaseAsset {
  platform: "macos-arm" | "windows";
  filename: string;
  download_url: string;
  size_bytes: number;
  checksum?: string; // SHA256 해시 (checksums.txt 파싱)
}

interface Release {
  version: string;
  released_at: string;
  assets: ReleaseAsset[];
  release_notes: string;
}

// ─── GitHub API 응답 타입 ─────────────────────────────────

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  assets: GitHubAsset[];
  body: string;
}

// ─── 플랫폼 감지 ──────────────────────────────────────────

function detectPlatform(filename: string): ReleaseAsset["platform"] | null {
  const lower = filename.toLowerCase();

  // macOS Apple Silicon only (aarch64)
  if (lower.includes("aarch64") && (lower.includes("macos") || lower.includes("darwin") || lower.endsWith(".dmg"))) {
    return "macos-arm";
  }

  // Windows .exe only (exclude .msi)
  if (lower.endsWith(".exe") || lower.includes("setup.exe")) {
    return "windows";
  }

  return null;
}

// ─── 다운로드 파일 필터 ───────────────────────────────────

const VALID_EXTENSIONS = [".dmg", ".exe"];

function isDownloadable(filename: string): boolean {
  const lower = filename.toLowerCase();
  // 소스 코드 아카이브 제외
  if (lower.includes("source")) return false;
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// ─── checksums.txt 파싱 ───────────────────────────────────
// 형식: `<sha256hash>  <filename>` (두 칸의 공백 구분)

function parseChecksums(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // SHA256 해시는 64자리 hex string
    const match = trimmed.match(/^([0-9a-f]{64})\s{2}(.+)$/i);
    if (match) {
      map.set(match[2], match[1]);
    }
  }
  return map;
}

// ─── checksums.txt 자산 다운로드 ───────────────────────────

async function fetchChecksums(
  assets: GitHubAsset[],
  headers: Record<string, string>
): Promise<Map<string, string>> {
  const checksumAsset = assets.find(
    (a) => a.name.toLowerCase() === "checksums.txt"
  );
  if (!checksumAsset) return new Map();

  try {
    const res = await fetch(checksumAsset.browser_download_url, { headers });
    if (!res.ok) return new Map();
    const text = await res.text();
    return parseChecksums(text);
  } catch {
    // checksums.txt 다운로드 실패 시 빈 맵 반환 (graceful degradation)
    return new Map();
  }
}

// ─── 속도 제한 (in-memory) ────────────────────────────────

const RATE_LIMIT_MAX = 20; // 1분당 최대 요청 수
const RATE_LIMIT_WINDOW_MS = 60_000;

let requestCount = 0;
let windowStart = Date.now();

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

function checkRateLimit(): RateLimitResult {
  const now = Date.now();
  if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
    // 윈도우 만료 → 카운터 리셋
    requestCount = 0;
    windowStart = now;
  }
  requestCount++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - requestCount);
  const resetAt = Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS) / 1000); // Unix epoch (초)
  return { limited: requestCount > RATE_LIMIT_MAX, remaining, resetAt };
}

// ─── API 핸들러 ───────────────────────────────────────────

export async function GET() {
  // 속도 제한 확인
  const rateLimit = checkRateLimit();
  if (rateLimit.limited) {
    return apiError(ERRORS.RATE_LIMITED, {
      status: 429,
      rateLimitHeaders: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  }

  try {
    const repo = process.env.GITHUB_REPO ?? "eonofpixel/Teu-Im";
    const githubUrl = `https://api.github.com/repos/${repo}/releases/latest`;

    // GitHub PAT 인증 (선택사항 — 로컬 개발 시 불필요)
    const token = process.env.GITHUB_TOKEN ?? process.env.GITHUB_PAT;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Teu-Im-Web",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(githubUrl, {
      headers,
      // GitHub API 응답을 60초간 캐시
      next: { revalidate: 60 },
    });

    if (response.status === 404) {
      // 릴리스가 아직 없음 — 빈 응답 반환
      return apiSuccess({ release: null }, { cacheTtl: 30 });
    }

    if (!response.ok) {
      throw new Error(`GitHub API 오류: ${response.status}`);
    }

    const github = (await response.json()) as GitHubRelease;

    // checksums.txt 파싱 (존재하지 않으면 빈 맵)
    const checksumMap = await fetchChecksums(github.assets, headers);

    // 다운로드 가능한 assets만 필터링 및 플랫폼 분류
    const assets: ReleaseAsset[] = github.assets
      .filter((a) => isDownloadable(a.name))
      .map((a) => {
        const platform = detectPlatform(a.name);
        if (!platform) return null;
        const checksum = checksumMap.get(a.name);
        return {
          platform,
          filename: a.name,
          download_url: a.browser_download_url,
          size_bytes: a.size,
          ...(checksum && { checksum }),
        };
      })
      .filter((a): a is ReleaseAsset => a !== null);

    const release: Release = {
      version: github.tag_name.replace(/^v/, ""),
      released_at: github.published_at,
      assets,
      release_notes: github.body ?? "",
    };

    return apiSuccess({ release }, { cacheTtl: 60 });
  } catch (error) {
    // GitHub API 실패 시 graceful degradation
    console.error("GET /api/releases/latest", error);
    return apiError(ERRORS.INTERNAL, { status: 503 });
  }
}
