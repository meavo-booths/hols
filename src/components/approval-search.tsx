"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";

export function ApprovalSearch({ initialQuery }: { initialQuery: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialQuery ?? "");

  useEffect(() => {
    setSearch(initialQuery ?? "");
  }, [initialQuery]);

  function pushQuery(q: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/approvals?${query}` : "/approvals");
    });
  }

  function clearSearch() {
    setSearch("");
    pushQuery(null);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = search.trim();
        pushQuery(trimmed || null);
      }}
    >
      <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
        <span className="font-medium text-slate-700">Search</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </label>
      <Button type="submit">Search</Button>
      <Button
        type="button"
        variant="secondary"
        onClick={clearSearch}
        disabled={!search.trim() && !initialQuery}
      >
        Clear
      </Button>
    </form>
  );
}
