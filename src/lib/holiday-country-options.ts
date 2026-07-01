export type HolidayCountryOption = {
  code: string;
  label: string;
};

export const HOLIDAY_COUNTRY_OPTIONS: HolidayCountryOption[] = [
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "BG", label: "Bulgaria" },
  { code: "CH", label: "Switzerland" },
  { code: "CZ", label: "Czechia" },
  { code: "DE", label: "Germany" },
  { code: "ES", label: "Spain" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
  { code: "GR", label: "Greece" },
  { code: "HR", label: "Croatia" },
  { code: "HU", label: "Hungary" },
  { code: "IE", label: "Ireland" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Romania" },
  { code: "SE", label: "Sweden" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
];

const VALID_CODES = new Set(HOLIDAY_COUNTRY_OPTIONS.map((option) => option.code));

export function isValidHolidayCountryCode(code: string | null | undefined): code is string {
  return Boolean(code && VALID_CODES.has(code));
}

export function holidayCountryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return HOLIDAY_COUNTRY_OPTIONS.find((option) => option.code === code)?.label ?? code;
}
