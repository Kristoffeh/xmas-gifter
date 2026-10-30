// Per-user personalization options. Add new settings here, as a column on
// the UserSettings model, and as a control in the dashboard's settings sheet.
export const SETTINGS_LIMITS = {
  cardBlur: { min: 0, max: 40, default: 16 },
} as const;

export type SettingKey = keyof typeof SETTINGS_LIMITS;
export type UserSettings = Record<SettingKey, number>;

export const DEFAULT_SETTINGS: UserSettings = {
  cardBlur: SETTINGS_LIMITS.cardBlur.default,
};

// Keeps only known keys and clamps each value into its allowed range
export function sanitizeSettings(input: unknown): Partial<UserSettings> {
  const result: Partial<UserSettings> = {};
  if (!input || typeof input !== "object") return result;

  for (const key of Object.keys(SETTINGS_LIMITS) as SettingKey[]) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const { min, max } = SETTINGS_LIMITS[key];
    result[key] = Math.min(max, Math.max(min, Math.round(value)));
  }
  return result;
}
