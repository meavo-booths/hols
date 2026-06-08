export const TEAM_COLORS = [
  "#EEDCDC",
  "#F4E3B1",
  "#E1E9EC",
  "#DCE4D7",
  "#E6E0EC",
  "#E4E0DA",
] as const;

export type TeamColor = (typeof TEAM_COLORS)[number];

export const DEFAULT_TEAM_COLOR: TeamColor = TEAM_COLORS[0];

export const TEAM_EVENT_TEXT_COLOR = "#334155";

export function isValidTeamColor(color: string): color is TeamColor {
  return (TEAM_COLORS as readonly string[]).includes(color);
}

export function resolveTeamColor(color: string | null | undefined): TeamColor {
  return color && isValidTeamColor(color) ? color : DEFAULT_TEAM_COLOR;
}
