/// <reference lib="dom" />

export interface SrtEntry {
  sequence: number;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
}

// Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)
function msToSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export function generateSrt(entries: SrtEntry[]): string {
  return entries
    .sort((a, b) => a.sequence - b.sequence)
    .map((entry, index) => {
      const startTime = msToSrtTime(entry.startTimeMs);
      const endTime = msToSrtTime(entry.endTimeMs);
      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
    })
    .join('\n');
}

/**
 * Triggers a browser download of SRT content.
 * This function must only be called on the client side.
 */
export function downloadSrt(content: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
