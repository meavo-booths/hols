import { Card } from "@/components/ui";

export function AllowanceSummary({
  allowance,
  used,
  remaining,
  year,
}: {
  allowance: number;
  used: number;
  remaining: number;
  year: number;
}) {
  const pct = allowance > 0 ? Math.min(100, (used / allowance) * 100) : 0;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{year} allowance</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold text-slate-900">{allowance}</p>
          <p className="text-xs text-slate-500">Total days</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-amber-600">{used}</p>
          <p className="text-xs text-slate-500">Used</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-emerald-600">{remaining}</p>
          <p className="text-xs text-slate-500">Remaining</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}
