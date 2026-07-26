export const PUBLIC_EQUITY_PROFILE_URI =
  "https://openfinanceformat.org/profiles/public-equity-research/0.1";

export const WORKBOOK_BINDING_PROFILE_URI =
  "https://openfinanceformat.org/profiles/workbook-binding/0.1";

export const SUPPORTED_PROFILE_URIS = Object.freeze([
  PUBLIC_EQUITY_PROFILE_URI,
  WORKBOOK_BINDING_PROFILE_URI,
] as const);

export function isSupportedProfileUri(
  value: string,
): value is (typeof SUPPORTED_PROFILE_URIS)[number] {
  return (SUPPORTED_PROFILE_URIS as readonly string[]).includes(value);
}
