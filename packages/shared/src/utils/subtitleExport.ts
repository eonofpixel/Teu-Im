import type { Interpretation } from "../types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SubtitleFormat = "srt" | "vtt";
export type SubtitleLanguage = "original" | "translated" | "both";

export interface SubtitleEntry {
  sequence: number;
  startTimeMs: number;
  endTimeMs: number;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
}

export interface SubtitleExportOptions {
  format: SubtitleFormat;
  language: SubtitleLanguage;
  /** When language is "both", controls whether original and translated appear
   *  on separate lines (default) or as a single joined block. */
  bothSeparator?: string;
}

export interface SubtitleExportResult {
  content: string;
  contentType: string;
  filename: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Zero-pad a number to the given width.
 */
function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

/**
 * Format milliseconds as HH:MM:SS,mmm (SRT) or HH:MM:SS.mmm (VTT).
 */
function formatTimestamp(ms: number, separator: "," | "."): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}${separator}${pad(millis, 3)}`;
}

/**
 * Resolve the display text for a single entry based on the requested language.
 */
function resolveText(
  entry: SubtitleEntry,
  language: SubtitleLanguage,
  bothSeparator: string
): string {
  switch (language) {
    case "original":
      return entry.originalText;
    case "translated":
      return entry.translatedText;
    case "both":
      return `${entry.originalText}${bothSeparator}${entry.translatedText}`;
  }
}

// ---------------------------------------------------------------------------
// Core formatters
// ---------------------------------------------------------------------------

/**
 * Generate an SRT subtitle string from an array of SubtitleEntry objects.
 *
 * Format:
 * ```
 * 1
 * 00:00:01,000 --> 00:00:04,000
 * First subtitle text
 *
 * 2
 * 00:00:04,000 --> 00:00:08,000
 * Second subtitle text
 * ```
 */
export function formatSRT(
  entries: SubtitleEntry[],
  language: SubtitleLanguage = "translated",
  bothSeparator = "\n"
): string {
  const sorted = [...entries].sort((a, b) => a.startTimeMs - b.startTimeMs);

  const blocks = sorted.map((entry, index) => {
    const start = formatTimestamp(entry.startTimeMs, ",");
    const end = formatTimestamp(entry.endTimeMs, ",");
    const text = resolveText(entry, language, bothSeparator);

    return `${index + 1}\n${start} --> ${end}\n${text}`;
  });

  // SRT blocks separated by blank lines, trailing newline at end
  return blocks.join("\n\n") + "\n";
}

/**
 * Generate a WebVTT subtitle string from an array of SubtitleEntry objects.
 *
 * Format:
 * ```
 * WEBVTT
 *
 * 00:00:01.000 --> 00:00:04.000
 * First subtitle text
 *
 * 00:00:04.000 --> 00:00:08.000
 * Second subtitle text
 * ```
 */
export function formatVTT(
  entries: SubtitleEntry[],
  language: SubtitleLanguage = "translated",
  bothSeparator = "\n"
): string {
  const sorted = [...entries].sort((a, b) => a.startTimeMs - b.startTimeMs);

  const blocks = sorted.map((entry) => {
    const start = formatTimestamp(entry.startTimeMs, ".");
    const end = formatTimestamp(entry.endTimeMs, ".");
    const text = resolveText(entry, language, bothSeparator);

    return `${start} --> ${end}\n${text}`;
  });

  // VTT starts with header, then blank-line-separated cues
  return "WEBVTT\n\n" + blocks.join("\n\n") + "\n";
}

// ---------------------------------------------------------------------------
// High-level export function
// ---------------------------------------------------------------------------

/**
 * Convert raw Interpretation rows into SubtitleEntry objects.
 * Filters out entries missing timing information.
 */
export function interpretationsToEntries(
  interpretations: Interpretation[]
): SubtitleEntry[] {
  return interpretations
    .filter(
      (i): i is Interpretation & { startTimeMs: number; endTimeMs: number } =>
        i.startTimeMs != null && i.endTimeMs != null
    )
    .map((i) => ({
      sequence: i.sequence,
      startTimeMs: i.startTimeMs,
      endTimeMs: i.endTimeMs,
      originalText: i.originalText,
      translatedText: i.translatedText,
      targetLanguage: i.targetLanguage,
    }));
}

/**
 * Full export pipeline: entries -> formatted subtitle string with metadata.
 *
 * @param entries Subtitle entries (must have valid timing)
 * @param sessionId Used to generate the download filename
 * @param options Export configuration
 * @returns Object containing the content string, MIME type, and suggested filename
 */
export function exportSubtitles(
  entries: SubtitleEntry[],
  sessionId: string,
  options: SubtitleExportOptions
): SubtitleExportResult {
  const { format, language, bothSeparator = "\n" } = options;

  const content =
    format === "srt"
      ? formatSRT(entries, language, bothSeparator)
      : formatVTT(entries, language, bothSeparator);

  const mimeType =
    format === "srt" ? "text/plain; charset=utf-8" : "text/vtt; charset=utf-8";

  const langSuffix = language === "both" ? "_bilingual" : `_${language}`;
  const filename = `session_${sessionId}${langSuffix}.${format}`;

  return {
    content,
    contentType: mimeType,
    filename,
  };
}
