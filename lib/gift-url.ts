// Shared by the gift form and the gifts API so both accept the same links.
export const GIFT_URL_MAX_LENGTH = 2048;
export const GIFT_NOTE_MAX_LENGTH = 1000;

// Adds https:// when the scheme is left out ("example.com/item") and returns
// the cleaned-up link, or null when it isn't an http(s) web address.
export function normalizeGiftUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > GIFT_URL_MAX_LENGTH) return null;

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}
