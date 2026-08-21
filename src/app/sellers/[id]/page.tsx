import { notFound } from "next/navigation";
import ItemCard from "@/components/ItemCard";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";

export default async function SellerProfilePage(
  props: PageProps<"/sellers/[id]">,
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: seller } = await supabase
    .from("profiles")
    .select("display_name, created_at")
    .eq("id", id)
    .single();

  if (!seller) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", id);

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const { count: salesCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", id);

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const items = listings ?? [];
  const coverImageUrls = await getCoverImageUrls(
    supabase,
    items.map((item) => item.id),
  );

  const memberSince = new Date(seller.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-forest">
            {seller.display_name}
          </h1>
          <p className="mt-1 text-sm text-forest/50">Member since {memberSince}</p>
        </div>

        <div className="flex gap-6">
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-forest">
              {items.length}
            </p>
            <p className="text-xs text-forest/50">Active listings</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-2xl font-semibold text-forest">
              {salesCount ?? 0}
            </p>
            <p className="text-xs text-forest/50">Items sold</p>
          </div>
          {avgRating !== null && (
            <div className="text-center">
              <p className="font-serif text-2xl font-semibold text-forest flex items-center justify-center gap-1">
                <span className="text-sunflower text-xl">★</span>
                {avgRating.toFixed(1)}
              </p>
              <p className="text-xs text-forest/50">
                {reviews!.length} review{reviews!.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-forest/60">No active listings at the moment.</p>
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
    </main>
  );
}
