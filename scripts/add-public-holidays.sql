-- Safe additive migration: user location + public holiday cache (hols)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "holidayCountryCode" TEXT;

CREATE TABLE IF NOT EXISTS "PublicHoliday" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "localName" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL DEFAULT '',
  "year" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicHoliday_countryCode_date_key"
  ON "PublicHoliday"("countryCode", "date");

CREATE INDEX IF NOT EXISTS "PublicHoliday_countryCode_year_idx"
  ON "PublicHoliday"("countryCode", "year");
