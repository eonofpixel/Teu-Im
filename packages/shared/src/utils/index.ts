export * from "./subtitleExport";

/**
 * 6자리 랜덤 참여 코드 생성
 * 예: "A1B2C3"
 */
export function generateProjectCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 초 단위를 사람이 읽기 쉬운 시간 문자열로 포맷
 * 예: formatDuration(3661) => "1시간 1분 1초"
 *     formatDuration(125)  => "2분 5초"
 *     formatDuration(45)   => "45초"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}시간`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}분`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}초`);
  }

  return parts.join(" ");
}
