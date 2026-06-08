"use client";

import { useCallback, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card } from "@/components/ui";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: {
    userName: string | null;
    userEmail: string;
    teams: string;
    days: number;
    note: string | null;
  };
};

export function VacationCalendar({
  teams,
  initialTeamId,
}: {
  teams: { id: string; name: string }[];
  initialTeamId?: string;
}) {
  const [teamId, setTeamId] = useState(initialTeamId ?? "");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

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
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by team</label>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-4">
        <FullCalendar
          key={teamId}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          events={fetchEvents}
          height="auto"
          eventClick={(info) => {
            setSelected({
              id: info.event.id,
              title: info.event.title,
              start: info.event.startStr,
              end: info.event.endStr,
              extendedProps: info.event.extendedProps as CalendarEvent["extendedProps"],
            });
          }}
          eventColor="#30A46C"
        />
      </Card>

      {selected && (
        <Card>
          <h3 className="font-semibold text-slate-900">
            {selected.extendedProps.userName ?? selected.extendedProps.userEmail}
          </h3>
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
