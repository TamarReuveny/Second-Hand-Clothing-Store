import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";
import ItemCard from "@/components/ItemCard";

export default async function MyFavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = (favorites ?? []).map((f) => f.listing_id);

  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("*").in("id", listingIds)
    : { data: [] };

  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]));
  const coverImageUrls = await getCoverImageUrls(supabase, listingIds);

  // Preserve the saved order (most recently saved first)
  const orderedListings = listingIds
    .map((id) => listingsById.get(id))
    .filter(Boolean) as NonNullable<(typeof listings)>[number][];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="mb-8 font-serif text-2xl font-semibold text-forest">
        Saved items
      </h1>

      {orderedListings.length === 0 ? (
        <p className="text-forest/60">
          Nothing saved yet.{" "}
          <Link href="/" className="underline">
            Browse listings
          </Link>{" "}
          and tap the heart on anything you like.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {orderedListings.map((listing) => (
            <div key={listing.id} className="relative">
              <ItemCard
                listing={listing}
                imageUrl={coverImageUrls.get(listing.id) ?? null}
                isFavorited={true}
              />
              {listing.status === "sold" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/30 backdrop-blur-[2px]">
                  <span className="rounded-full bg-forest px-3 py-1 text-sm font-semibold text-cream">
                    Sold
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
