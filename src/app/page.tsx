import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import FiltersBar from "@/components/FiltersBar";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";

const CATEGORY_SYNONYMS: Record<string, string> = {
  pants: "bottoms",
  trousers: "bottoms",
  jeans: "bottoms",
  skirt: "bottoms",
  shorts: "bottoms",
  shirt: "tops",
  blouse: "tops",
  tee: "tops",
  top: "tops",
  jacket: "outerwear",
  coat: "outerwear",
  sneakers: "shoes",
  boots: "shoes",
  heels: "shoes",
  sandals: "shoes",
  belt: "accessories",
  bag: "accessories",
  hat: "accessories",
  scarf: "accessories",
  dress: "dresses",
};

const FEATURES = [
  { color: "bg-teal", label: "Better for the planet" },
  { color: "bg-blush", label: "One-of-a-kind pieces" },
  { color: "bg-sunflower", label: "Great style, less spend" },
  { color: "bg-lavender", label: "Reduce, reuse, rewear" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    condition?: string;
    size?: string;
    color?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    sort?: string;
  }>;
}) {
  const { q, category, condition, size, color, minPrice, maxPrice, minRating, sort } =
    await searchParams;

  const categories = category?.split(",").filter(Boolean) ?? [];
  const conditions = condition?.split(",").filter(Boolean) ?? [];
  const sizes = size?.split(",").filter(Boolean) ?? [];
  const colors = color?.split(",").filter(Boolean) ?? [];

  const supabase = await createClient();
  let query = supabase.from("listings").select("*").eq("status", "active");

  if (q) {
    const categoryMatch = CATEGORY_SYNONYMS[q.toLowerCase()] ?? q;
    query = query.or(`title.ilike.%${q}%,category.ilike.%${categoryMatch}%`);
  }
  if (categories.length > 0) query = query.in("category", categories);
  if (conditions.length > 0) query = query.in("condition", conditions);
  if (sizes.length > 0) query = query.in("size", sizes);
  if (colors.length > 0) query = query.in("color", colors);
  if (minPrice) query = query.gte("price", parseFloat(minPrice));
  if (maxPrice) query = query.lte("price", parseFloat(maxPrice));

  if (minRating) {
    const threshold = parseFloat(minRating);
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("seller_id, rating");
    const totals = new Map<string, { sum: number; count: number }>();
    for (const r of allReviews ?? []) {
      const entry = totals.get(r.seller_id) ?? { sum: 0, count: 0 };
      entry.sum += r.rating;
      entry.count += 1;
      totals.set(r.seller_id, entry);
    }
    const qualifiedSellers = [...totals.entries()]
      .filter(([, { sum, count }]) => sum / count >= threshold)
      .map(([id]) => id);
    query = query.in("seller_id", qualifiedSellers.length > 0 ? qualifiedSellers : ["none"]);
  }

  if (sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: listings } = await query;

  const items = listings ?? [];
  const coverImageUrls = await getCoverImageUrls(
    supabase,
    items.map((item) => item.id),
  );

  const isFiltered =
    q ||
    categories.length > 0 ||
    conditions.length > 0 ||
    sizes.length > 0 ||
    colors.length > 0 ||
    minPrice ||
    maxPrice ||
    minRating ||
    sort;

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div
          className="blob absolute -left-24 -top-24 h-72 w-72 bg-sunflower-light"
          aria-hidden
        />
        <div
          className="blob absolute -right-16 -top-10 h-64 w-64 bg-teal-light"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-forest sm:text-5xl">
            Give your closet a
          </h1>
          <p className="font-script mt-1 text-5xl text-blush sm:text-6xl">
            second life
          </p>
          <p className="mx-auto mt-5 max-w-md text-forest/70">
            Buy and sell pre-loved clothing from people near you.
            <br />
            Good for your wallet, better for the planet.
          </p>
          <Link
            href="/sell"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 font-medium text-cream hover:bg-forest/90"
          >
            Start selling <span aria-hidden>♥</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-6 pb-14 sm:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full ${feature.color}`}
              aria-hidden
            />
            <span className="text-xs font-medium text-forest/80 sm:text-sm">
              {feature.label}
            </span>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <FiltersBar />

        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold text-forest">
            {q ? `Results for "${q}"` : "Fresh finds"}
          </h2>
          <p className="text-sm text-forest/60">
            {items.length} item{items.length === 1 ? "" : "s"} available
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-forest/60">
            {isFiltered ? (
              <>
                No items match your filters.{" "}
                <Link href="/" className="underline">
                  Clear all
                </Link>
              </>
            ) : (
              <>
                No listings yet. Be the first to{" "}
                <Link href="/sell" className="underline">
                  sell an item
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((listing) => (
              <ItemCard
                key={listing.id}
                listing={listing}
                imageUrl={coverImageUrls.get(listing.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
