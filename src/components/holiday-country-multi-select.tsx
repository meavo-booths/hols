"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HOLIDAY_COUNTRY_OPTIONS } from "@/lib/holiday-country-options";

function selectionLabel(selectedCodes: string[]): string {
  if (selectedCodes.length === 0) return "None";
  if (selectedCodes.length === 1) {
    const option = HOLIDAY_COUNTRY_OPTIONS.find((item) => item.code === selectedCodes[0]);
    return option ? `${option.code} — ${option.label}` : selectedCodes[0];
  }
  return `${selectedCodes.length} countries`;
}

export function HolidayCountryMultiSelect({
  selectedCodes,
  onChange,
}: {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedSet = new Set(selectedCodes);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (code: string) => {
    if (selectedSet.has(code)) {
      onChange(selectedCodes.filter((item) => item !== code));
      return;
    }
    onChange([...selectedCodes, code]);
  };

  return (
    <div ref={rootRef} className="relative block space-y-1 text-sm">
      <span className="font-medium text-slate-700">Show public holidays</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 sm:w-64"
      >
        <span className="truncate">{selectionLabel(selectedCodes)}</span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg sm:w-64"
        >
          {HOLIDAY_COUNTRY_OPTIONS.map((option) => {
            const checked = selectedSet.has(option.code);
            return (
              <label
                key={option.code}
                role="option"
                aria-selected={checked}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.code)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-100"
                />
                <span>
                  {option.code} — {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
