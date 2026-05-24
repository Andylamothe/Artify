const AR_WEB_URL = process.env.NEXT_PUBLIC_AR_WEB_URL ?? "";

export function buildArExperienceUrl(arWebId: string): string {
  return `${AR_WEB_URL}/ar?artwork=${encodeURIComponent(arWebId)}`;
}
