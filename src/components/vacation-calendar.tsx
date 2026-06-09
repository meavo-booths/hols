"use client";

import { useCallback, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { resolveTeamColor } from "@/lib/team-colors";
import { Card } from "@/components/ui";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    userName: string | null;
    userEmail: string;
    teams: string;
    days: number;
    note: string | null;
    color?: string;
  };
};

export function VacationCalendar({
  teams,
  initialTeamId,
}: {
  teams: { id: string; name: string; color: string }[];
  initialTeamId?: string;
}) {
  const [teamId, setTeamId] = useState(initialTeamId ?? "");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const fetchEvents = useCallback(
    async (info: { startStr: string; endStr: string }) => {
      const params = new URLSearchParams({
        start: info.startStr,
        end: info.endStr,
      });
      if (teamId) params.set("teamId", teamId);

      const res = await fetch(`/api/calendar?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    [teamId]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by team</label>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-auto"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2 text-sm text-slate-600">
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: resolveTeamColor(team.color) }}
              />
              {team.name}
            </div>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto p-2 sm:p-4">
        <FullCalendar
          key={`${teamId}-${isMobile ? "mobile" : "desktop"}`}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }
          }
          events={fetchEvents}
          height="auto"
          eventClick={(info) => {
            setSelected({
              id: info.event.id,
              title: info.event.title,
              start: info.event.startStr,
              end: info.event.endStr,
              backgroundColor: info.event.backgroundColor,
              borderColor: info.event.borderColor,
              textColor: info.event.textColor,
              extendedProps: info.event.extendedProps as CalendarEvent["extendedProps"],
            });
          }}
        />
      </Card>

      {selected && (
        <Card>
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 shrink-0 rounded"
              style={{
                backgroundColor: resolveTeamColor(selected.extendedProps.color),
              }}
            />
            <h3 className="font-semibold text-slate-900">
              {selected.extendedProps.userName ?? selected.extendedProps.userEmail}
            </h3>
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-slate-600">
            <div>
              <dt className="inline font-medium">Dates: </dt>
              <dd className="inline">
                {selected.start} → {new Date(new Date(selected.end).getTime() - 86400000)
                  .toISOString()
                  .slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Working days: </dt>
              <dd className="inline">{selected.extendedProps.days}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Team(s): </dt>
              <dd className="inline">{selected.extendedProps.teams || "—"}</dd>
            </div>
            {selected.extendedProps.note && (
              <div>
                <dt className="inline font-medium">Note: </dt>
                <dd className="inline">{selected.extendedProps.note}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-4 text-sm text-brand-600 hover:underline"
          >
            Close
          </button>
        </Card>
      )}
    </div>
  );
}
