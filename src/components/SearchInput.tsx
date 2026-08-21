"use client";

import { useSearchParams } from "next/navigation";

export default function SearchInput() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <form method="get" action="/">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-forest/40">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search items…"
          className="w-48 rounded-full border border-forest/20 bg-cream py-1.5 pl-9 pr-4 text-sm text-forest placeholder:text-forest/40 focus:border-forest/50 focus:outline-none focus:w-64 transition-all"
        />
      </div>
    </form>
  );
}
