import { prisma } from "@/lib/prisma";
import { isValidHolidayCountryCode } from "@/lib/holiday-country-options";

const GB_ENG_SUBDIVISION = "GB-ENG";
/** England has ~10–12 public holidays per year; old cache stored only nationwide (global) days. */
const GB_MIN_COMPLETE_HOLIDAYS = 10;

type NagerHoliday = {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  counties: string[] | null;
  types: string[];
};

function holidayAppliesForCountry(holiday: NagerHoliday, countryCode: string): boolean {
  if (!holiday.types.includes("Public")) return false;

  if (countryCode === "GB") {
    return holiday.global || (holiday.counties?.includes(GB_ENG_SUBDIVISION) ?? false);
  }

  return holiday.global;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseApiDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

async function fetchPublicHolidaysFromApi(
  countryCode: string,
  year: number
): Promise<NagerHoliday[]> {
  const response = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
    { next: { revalidate: 60 * 60 * 24 } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch public holidays for ${countryCode} ${year}`);
  }

  const holidays = (await response.json()) as NagerHoliday[];
  return holidays.filter((holiday) => holidayAppliesForCountry(holiday, countryCode));
}

export async function ensurePublicHolidaysForYear(
  countryCode: string,
  year: number
): Promise<void> {
  if (!isValidHolidayCountryCode(countryCode)) return;

  const existing = await prisma.publicHoliday.count({
    where: { countryCode, year },
  });
  const minComplete = countryCode === "GB" ? GB_MIN_COMPLETE_HOLIDAYS : 1;
  if (existing >= minComplete) return;

  if (countryCode === "GB" && existing > 0) {
    await prisma.publicHoliday.deleteMany({ where: { countryCode: "GB", year } });
  }

  const holidays = await fetchPublicHolidaysFromApi(countryCode, year);
  if (holidays.length === 0) return;

  await prisma.$transaction(
    holidays.map((holiday) =>
      prisma.publicHoliday.upsert({
        where: {
          countryCode_date: {
            countryCode,
            date: parseApiDate(holiday.date),
          },
        },
        update: {
          localName: holiday.localName,
          name: holiday.name,
          year,
        },
        create: {
          countryCode,
          date: parseApiDate(holiday.date),
          localName: holiday.localName,
          name: holiday.name,
          year,
        },
      })
    )
  );
}

export async function getPublicHolidaysInRange(
  countryCode: string,
  start: Date,
  end: Date
): Promise<
  {
    date: Date;
    localName: string;
    name: string;
  }[]
> {
  if (!isValidHolidayCountryCode(countryCode)) return [];

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  for (let year = startYear; year <= endYear; year += 1) {
    await ensurePublicHolidaysForYear(countryCode, year);
  }

  return getCachedPublicHolidaysInRange(countryCode, start, end);
}

/**
 * Reads cached holidays only — no external API calls. Used on hot read paths
 * (calendar GET); the cache is kept warm by the sync-holidays cron and by
 * request-creation flows that call getPublicHolidaysInRange.
 */
export async function getCachedPublicHolidaysInRange(
  countryCode: string,
  start: Date,
  end: Date
): Promise<
  {
    date: Date;
    localName: string;
    name: string;
  }[]
> {
  if (!isValidHolidayCountryCode(countryCode)) return [];

  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return prisma.publicHoliday.findMany({
    where: {
      countryCode,
      date: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      localName: true,
      name: true,
    },
  });
}

/**
 * Warms the public-holiday cache for every country code currently assigned to
 * a user, for the current and next year. Called from the sync-holidays cron.
 */
export async function syncPublicHolidays(): Promise<{
  countries: string[];
  years: number[];
}> {
  const usersWithCountry = await prisma.user.findMany({
    where: { holidayCountryCode: { not: null } },
    select: { holidayCountryCode: true },
    distinct: ["holidayCountryCode"],
  });
  const countries = usersWithCountry
    .map((user) => user.holidayCountryCode)
    .filter((code): code is string => isValidHolidayCountryCode(code));

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  for (const countryCode of countries) {
    for (const year of years) {
      await ensurePublicHolidaysForYear(countryCode, year);
    }
  }

  return { countries, years };
}

export async function getPublicHolidayDateSet(
  countryCode: string,
  start: Date,
  end: Date
): Promise<Set<string>> {
  const holidays = await getPublicHolidaysInRange(countryCode, start, end);
  return new Set(holidays.map((holiday) => toDateKey(holiday.date)));
}

export function publicHolidayCalendarEvents(
  countryCode: string,
  holidays: { date: Date; localName: string; name: string }[]
) {
  return holidays.map((holiday) => {
    const dateKey = toDateKey(holiday.date);
    const title = holiday.localName || holiday.name;
    return {
      id: `ph-${countryCode}-${dateKey}`,
      title,
      start: dateKey,
      display: "background" as const,
      backgroundColor: "#e2e8f0",
      borderColor: "#cbd5e1",
      extendedProps: {
        kind: "publicHoliday" as const,
        countryCode,
        localName: holiday.localName,
        name: holiday.name,
      },
    };
  });
}
