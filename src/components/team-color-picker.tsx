import { DEFAULT_TEAM_COLOR, TEAM_COLORS } from "@/lib/team-colors";

export function TeamColorPicker({ name = "color" }: { name?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">Team colour</legend>
      <div className="flex flex-wrap gap-3">
        {TEAM_COLORS.map((color) => (
          <label key={color} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={color}
              defaultChecked={color === DEFAULT_TEAM_COLOR}
              className="peer sr-only"
            />
            <span
              className="block h-9 w-9 rounded-lg border-2 border-transparent ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-checked:border-slate-600"
              style={{ backgroundColor: color }}
              title={color}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
