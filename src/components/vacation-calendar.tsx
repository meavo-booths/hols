"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { resolveTeamColor, TEAM_EVENT_TEXT_COLOR } from "@/lib/team-colors";
import { formatDayLabel } from "@/lib/days-format";
import { holidayCountryLabel } from "@/lib/holiday-country-options";
import { Card } from "@/components/ui";
import { HolidayCountryMultiSelect } from "@/components/holiday-country-multi-select";

type LeaveEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    kind: "leave";
    userName: string | null;
    userEmail: string;
    teams: string;
    days: number;
    note: string | null;
    color?: string;
  };
};

type PublicHolidayEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  display?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    kind: "publicHoliday";
    countryCode: string;
    localName: string;
    name: string;
  };
};

type SelectedLeave = LeaveEvent;
type SelectedHoliday = PublicHolidayEvent;

export function VacationCalendar({
  teams,
  initialTeamId,
}: {
  teams: { id: string; name: string; color: string }[];
  initialTeamId?: string;
}) {
  const [teamIds, setTeamIds] = useState<string[]>(() =>
    initialTeamId ? [initialTeamId] : []
  );
  const [holidayCountryCodes, setHolidayCountryCodes] = useState<string[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<SelectedLeave | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<SelectedHoliday | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const selectedTeamSet = new Set(teamIds);

  const toggleTeam = (teamId: string) => {
    setTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId]
    );
  };

  const fetchEvents = useCallback(
    async (info: { startStr: string; endStr: string }) => {
      const params = new URLSearchParams({
        start: info.startStr,
        end: info.endStr,
      });
      for (const id of teamIds) params.append("teamId", id);
      for (const code of holidayCountryCodes) params.append("countryCode", code);

      try {
        const res = await fetch(`/api/calendar?${params}`);
        if (!res.ok) {
          setLoadError(true);
          return [];
        }
        setLoadError(false);
        return await res.json();
      } catch {
        setLoadError(true);
        return [];
      }
    },
    [teamIds, holidayCountryCodes]
  );

  const filterKey = `${teamIds.slice().sort().join(",")}-${holidayCountryCodes
    .slice()
    .sort()
    .join(",")}-${isMobile ? "mobile" : "desktop"}`;

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The calendar could not be loaded. Check your connection and try refreshing the page.
        </p>
      )}

      <HolidayCountryMultiSelect
        selectedCodes={holidayCountryCodes}
        onChange={setHolidayCountryCodes}
      />

      {(teams.length > 0 || holidayCountryCodes.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {teams.map((team) => {
            const active = selectedTeamSet.has(team.id);
            const color = resolveTeamColor(team.color);
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => toggleTeam(team.id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  active
                    ? ""
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                style={
                  active
                    ? {
                        backgroundColor: color,
                        color: TEAM_EVENT_TEXT_COLOR,
                        borderColor: color,
                      }
                    : undefined
                }
              >
                {team.name}
              </button>
            );
          })}
          {teamIds.length > 0 && (
            <button
              type="button"
              onClick={() => setTeamIds([])}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
            >
              Clear
            </button>
          )}
          {holidayCountryCodes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-4 w-4 shrink-0 rounded border border-slate-300 bg-slate-200" />
              Public holiday
            </div>
          )}
        </div>
      )}

      <Card className="overflow-x-auto p-2 sm:p-4">
        <FullCalendar
          key={filterKey}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }
          }
          events={fetchEvents}
          height="auto"
          eventClick={(info) => {
            const props = info.event.extendedProps as
              | LeaveEvent["extendedProps"]
              | PublicHolidayEvent["extendedProps"];

            if (props.kind === "publicHoliday") {
              setSelectedLeave(null);
              setSelectedHoliday({
                id: info.event.id,
                title: info.event.title,
                start: info.event.startStr,
                display: info.event.display,
                backgroundColor: info.event.backgroundColor,
                borderColor: info.event.borderColor,
                extendedProps: props,
              });
              return;
            }

            setSelectedHoliday(null);
            setSelectedLeave({
              id: info.event.id,
              title: info.event.title,
              start: info.event.startStr,
              end: info.event.endStr,
              backgroundColor: info.event.backgroundColor,
              borderColor: info.event.borderColor,
              textColor: info.event.textColor,
              extendedProps: props,
            });
          }}
        />
      </Card>

      {selectedHoliday && (
        <Card>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 rounded border border-slate-300 bg-slate-200" />
            <h3 className="font-semibold text-slate-900">{selectedHoliday.title}</h3>
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-slate-600">
            <div>
              <dt className="inline font-medium">Date: </dt>
              <dd className="inline">{selectedHoliday.start}</dd>
            </div>
            {selectedHoliday.extendedProps.name &&
              selectedHoliday.extendedProps.name !== selectedHoliday.title && (
                <div>
                  <dt className="inline font-medium">English name: </dt>
                  <dd className="inline">{selectedHoliday.extendedProps.name}</dd>
                </div>
              )}
            <div>
              <dt className="inline font-medium">Country: </dt>
              <dd className="inline">
                {holidayCountryLabel(selectedHoliday.extendedProps.countryCode)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => setSelectedHoliday(null)}
            className="mt-4 text-sm text-brand-600 hover:underline"
          >
            Close
          </button>
        </Card>
      )}

      {selectedLeave && (
        <Card>
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 shrink-0 rounded"
              style={{
                backgroundColor: resolveTeamColor(selectedLeave.extendedProps.color),
              }}
            />
            <h3 className="font-semibold text-slate-900">
              {selectedLeave.extendedProps.userName ?? selectedLeave.extendedProps.userEmail}
            </h3>
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-slate-600">
            <div>
              <dt className="inline font-medium">Dates: </dt>
              <dd className="inline">
                {selectedLeave.start} → {new Date(new Date(selectedLeave.end).getTime() - 86400000)
                  .toISOString()
                  .slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Duration: </dt>
              <dd className="inline">{formatDayLabel(selectedLeave.extendedProps.days)}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Team(s): </dt>
              <dd className="inline">{selectedLeave.extendedProps.teams || "—"}</dd>
            </div>
            {selectedLeave.extendedProps.note && (
              <div>
                <dt className="inline font-medium">Note: </dt>
                <dd className="inline">{selectedLeave.extendedProps.note}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            onClick={() => setSelectedLeave(null)}
            className="mt-4 text-sm text-brand-600 hover:underline"
          >
            Close
          </button>
        </Card>
      )}
    </div>
  );
}
