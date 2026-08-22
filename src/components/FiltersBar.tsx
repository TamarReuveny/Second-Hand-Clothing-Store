"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CATEGORIES = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "dresses", label: "Dresses" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "accessories", label: "Accessories" },
];

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like-new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"];

const COLORS = [
  "Black", "White", "Grey", "Beige", "Brown",
  "Red", "Pink", "Orange", "Yellow",
  "Green", "Teal", "Blue", "Navy", "Purple",
  "Multicolor",
];

const MIN_RATINGS = [
  { value: "4", label: "4★ & up" },
  { value: "3", label: "3★ & up" },
  { value: "2", label: "2★ & up" },
];

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function FiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedCategories =
    searchParams.get("category")?.split(",").filter(Boolean) ?? [];
  const selectedConditions =
    searchParams.get("condition")?.split(",").filter(Boolean) ?? [];
  const selectedSizes =
    searchParams.get("size")?.split(",").filter(Boolean) ?? [];
  const selectedColors =
    searchParams.get("color")?.split(",").filter(Boolean) ?? [];
  const minRating = searchParams.get("minRating") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const sort = searchParams.get("sort") ?? "";

  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);

  // Reset the editable price inputs whenever the URL's price params change
  // externally (e.g. Clear filters, browser back). Setting state directly
  // during render like this is React's recommended way to sync local state
  // with a changing prop, since it bails out before committing rather than
  // triggering an extra effect-driven re-render.
  const searchParamsKey = searchParams.toString();
  const [prevSearchParamsKey, setPrevSearchParamsKey] = useState(searchParamsKey);
  if (searchParamsKey !== prevSearchParamsKey) {
    setPrevSearchParamsKey(searchParamsKey);
    setPriceMin(minPrice);
    setPriceMax(maxPrice);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeFilterCount =
    selectedCategories.length +
    selectedConditions.length +
    selectedSizes.length +
    selectedColors.length +
    (minRating ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/?${params.toString()}`);
  }

  function toggleMulti(param: string, value: string, current: string[]) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set(param, next.join(","));
    else params.delete(param);
    router.push(`/?${params.toString()}`);
  }

  function applyPrice() {
    const params = new URLSearchParams(searchParams.toString());
    if (priceMin) params.set("minPrice", priceMin);
    else params.delete("minPrice");
    if (priceMax) params.set("maxPrice", priceMax);
    else params.delete("maxPrice");
    router.push(`/?${params.toString()}`);
    setOpen(false);
  }

  function clearFilters() {
    const q = searchParams.get("q");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    setPriceMin("");
    setPriceMax("");
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
    setOpen(false);
  }

  function updateSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            activeFilterCount > 0
              ? "border-forest bg-forest text-cream"
              : "border-forest/20 bg-cream text-forest hover:border-forest/40"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4h18M7 8h10M11 12h2"
            />
          </svg>
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>

        {open && (
          <div className="absolute left-0 top-10 z-20 w-72 rounded-2xl border border-forest/10 bg-cream p-5 shadow-lg">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Category
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() =>
                    toggleMulti("category", c.value, selectedCategories)
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedCategories.includes(c.value)
                      ? "border-forest bg-forest text-cream"
                      : "border-forest/20 text-forest hover:border-forest/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Condition
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() =>
                    toggleMulti("condition", c.value, selectedConditions)
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedConditions.includes(c.value)
                      ? "border-forest bg-forest text-cream"
                      : "border-forest/20 text-forest hover:border-forest/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Size
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleMulti("size", s, selectedSizes)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedSizes.includes(s)
                      ? "border-forest bg-forest text-cream"
                      : "border-forest/20 text-forest hover:border-forest/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Color
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleMulti("color", c, selectedColors)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedColors.includes(c)
                      ? "border-forest bg-forest text-cream"
                      : "border-forest/20 text-forest hover:border-forest/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Seller Rating
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {MIN_RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() =>
                    updateParam("minRating", minRating === r.value ? "" : r.value)
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    minRating === r.value
                      ? "border-forest bg-forest text-cream"
                      : "border-forest/20 text-forest hover:border-forest/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest/50">
              Price
            </p>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="$ Min"
                className="w-full rounded-lg border border-forest/20 bg-white/60 px-3 py-1.5 text-sm text-forest focus:border-forest/50 focus:outline-none"
              />
              <span className="text-forest/40">–</span>
              <input
                type="number"
                min={0}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="$ Max"
                className="w-full rounded-lg border border-forest/20 bg-white/60 px-3 py-1.5 text-sm text-forest focus:border-forest/50 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-forest/50 underline hover:text-forest"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={applyPrice}
                className="ml-auto rounded-full bg-forest px-4 py-1.5 text-xs font-medium text-cream hover:bg-forest/90"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <select
        value={sort}
        onChange={(e) => updateSort(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full border px-3 py-1.5 text-sm focus:outline-none ${
          sort
            ? "border-forest bg-forest text-cream"
            : "border-forest/20 bg-cream text-forest hover:border-forest/40"
        }`}
      >
        <option value="">Sort</option>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
