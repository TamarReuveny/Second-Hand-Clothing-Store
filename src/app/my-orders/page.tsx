import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";

export default async function MyOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const listingIds = [...new Set((orders ?? []).map((o) => o.listing_id))];
  const { data: listingRows } = listingIds.length
    ? await supabase
        .from("listings")
        .select("id, title, size")
        .in("id", listingIds)
    : { data: [] };

  const listingsById = new Map(
    (listingRows ?? []).map((listing) => [listing.id, listing]),
  );
  const coverImageUrls = await getCoverImageUrls(supabase, listingIds);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-8 font-serif text-2xl font-semibold text-forest">
        My orders
      </h1>

      {!orders || orders.length === 0 ? (
        <p className="text-forest/60">
          You haven&apos;t bought anything yet.{" "}
          <Link href="/" className="underline">
            Browse listings
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const listing = listingsById.get(order.listing_id);
            return (
              <div
                key={order.id}
                className="flex items-center gap-4 rounded-xl border border-forest/10 bg-white/60 p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-forest/5">
                  {coverImageUrls.get(order.listing_id) && (
                    <Image
                      src={coverImageUrls.get(order.listing_id)!}
                      alt={listing?.title ?? "Listing"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-forest">
                    {listing?.title ?? "Listing removed"}
                  </h3>
                  <p className="text-sm text-forest/60">
                    ${order.price} · Size {listing?.size} · Ordered{" "}
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
