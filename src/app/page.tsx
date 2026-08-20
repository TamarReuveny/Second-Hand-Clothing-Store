import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";

const FEATURES = [
  { color: "bg-teal", label: "Better for the planet" },
  { color: "bg-blush", label: "One-of-a-kind pieces" },
  { color: "bg-sunflower", label: "Great style, less spend" },
  { color: "bg-lavender", label: "Reduce, reuse, rewear" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const items = listings ?? [];
  const coverImageUrls = await getCoverImageUrls(
    supabase,
    items.map((item) => item.id),
  );

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
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-semibold text-forest">
            Fresh finds
          </h2>
          <p className="text-sm text-forest/60">
            {items.length} item{items.length === 1 ? "" : "s"} available
          </p>
        </div>
        {items.length === 0 ? (
          <p className="text-forest/60">
            No listings yet. Be the first to{" "}
            <Link href="/sell" className="underline">
              sell an item
            </Link>
            .
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
