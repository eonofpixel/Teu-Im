import { describe, it, expect } from 'vitest';

/**
 * These are pure functions extracted from the release API route
 * for testing purposes. In actual implementation, they exist inline
 * within the route file.
 */

// ─── Platform Detection ──────────────────────────────────────

type Platform = "macos-arm" | "windows" | null;

function detectPlatform(filename: string): Platform {
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

// ─── Download File Filter ────────────────────────────────────

const VALID_EXTENSIONS = [".dmg", ".exe"];

function isDownloadable(filename: string): boolean {
  const lower = filename.toLowerCase();
  // Exclude source code archives
  if (lower.includes("source")) return false;
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// ─── Checksums Parser ────────────────────────────────────────

function parseChecksums(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // SHA256 hash is 64-char hex string
    const match = trimmed.match(/^([0-9a-f]{64})\s{2}(.+)$/i);
    if (match) {
      map.set(match[2], match[1]);
    }
  }
  return map;
}

// ─── Tests ───────────────────────────────────────────────────

describe('detectPlatform', () => {
  it('should detect macOS ARM from aarch64 DMG filename', () => {
    expect(detectPlatform('Teu-Im_0.1.0_aarch64.dmg')).toBe('macos-arm');
  });

  it('should detect macOS ARM from darwin aarch64 filename', () => {
    expect(detectPlatform('teu-im-darwin-aarch64.dmg')).toBe('macos-arm');
  });

  it('should detect macOS ARM from macos aarch64 filename', () => {
    expect(detectPlatform('teu-im-macos-aarch64.app.tar.gz')).toBe('macos-arm');
  });

  it('should detect Windows from .exe filename', () => {
    expect(detectPlatform('Teu-Im_0.1.0_x64-setup.exe')).toBe('windows');
  });

  it('should detect Windows from setup.exe in filename', () => {
    expect(detectPlatform('TeuIm-setup.exe')).toBe('windows');
  });

  it('should return null for non-ARM macOS binaries', () => {
    expect(detectPlatform('Teu-Im_0.1.0_x64.dmg')).toBeNull();
  });

  it('should return null for Linux binaries', () => {
    expect(detectPlatform('teu-im_0.1.0_amd64.AppImage')).toBeNull();
  });

  it('should return null for source archives', () => {
    expect(detectPlatform('source.tar.gz')).toBeNull();
  });

  it('should be case-insensitive', () => {
    expect(detectPlatform('TeuIm_AARCH64.DMG')).toBe('macos-arm');
    expect(detectPlatform('SETUP.EXE')).toBe('windows');
  });
});

describe('isDownloadable', () => {
  it('should accept .dmg files', () => {
    expect(isDownloadable('Teu-Im_0.1.0.dmg')).toBe(true);
  });

  it('should accept .exe files', () => {
    expect(isDownloadable('Teu-Im-setup.exe')).toBe(true);
  });

  it('should reject source code archives', () => {
    expect(isDownloadable('source.tar.gz')).toBe(false);
    expect(isDownloadable('source-code.zip')).toBe(false);
  });

  it('should reject files without valid extensions', () => {
    expect(isDownloadable('README.md')).toBe(false);
    expect(isDownloadable('checksums.txt')).toBe(false);
  });

  it('should reject .msi files', () => {
    expect(isDownloadable('Teu-Im.msi')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isDownloadable('TeuIm.DMG')).toBe(true);
    expect(isDownloadable('TeuIm.EXE')).toBe(true);
  });
});

describe('parseChecksums', () => {
  it('should parse valid checksums.txt format', () => {
    const content = `
a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd  file1.dmg
1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  file2.exe
    `.trim();

    const map = parseChecksums(content);

    expect(map.size).toBe(2);
    expect(map.get('file1.dmg')).toBe('a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd');
    expect(map.get('file2.exe')).toBe('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  });

  it('should handle empty lines gracefully', () => {
    const content = `
a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd  file1.dmg

1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef  file2.exe

    `;

    const map = parseChecksums(content);
    expect(map.size).toBe(2);
  });

  it('should require exactly 64 hex characters for hash', () => {
    // Too short
    const shortHash = 'abc123  file.dmg';
    expect(parseChecksums(shortHash).size).toBe(0);

    // Too long
    const longHash = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd00  file.dmg';
    expect(parseChecksums(longHash).size).toBe(0);
  });

  it('should require two spaces between hash and filename', () => {
    // Single space
    const singleSpace = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd file.dmg';
    expect(parseChecksums(singleSpace).size).toBe(0);

    // Tab character
    const tab = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd\tfile.dmg';
    expect(parseChecksums(tab).size).toBe(0);
  });

  it('should handle uppercase hex characters', () => {
    const content = 'A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD  file.dmg';
    const map = parseChecksums(content);

    expect(map.size).toBe(1);
    expect(map.get('file.dmg')).toBe('A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD');
  });

  it('should return empty map for empty input', () => {
    expect(parseChecksums('').size).toBe(0);
    expect(parseChecksums('   \n  \n  ').size).toBe(0);
  });

  it('should handle filenames with spaces', () => {
    const content = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd  Teu Im Setup.exe';
    const map = parseChecksums(content);

    expect(map.size).toBe(1);
    expect(map.get('Teu Im Setup.exe')).toBe('a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd');
  });
});
