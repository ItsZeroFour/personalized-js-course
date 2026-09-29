/** Склейка className: отбрасывает false, null и undefined. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}
