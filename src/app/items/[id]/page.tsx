import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "@/components/BuyButton";
import PhotoGallery from "@/components/PhotoGallery";
import { getListingImageUrl } from "@/lib/supabase/storage";
import type { ListingRow } from "@/lib/supabase/types";

const conditionLabels: Record<ListingRow["condition"], string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
};

export default async function ItemPage(props: PageProps<"/items/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (!listing) {
    notFound();
  }

  const { data: seller } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", listing.seller_id)
    .single();

  const { data: sellerReviews } = await supabase
    .from("reviews")
    .select("rating")
    .eq("seller_id", listing.seller_id);

  const avgRating =
    sellerReviews && sellerReviews.length > 0
      ? sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length
      : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnListing = user?.id === listing.seller_id;

  const { data: images } = await supabase
    .from("listing_images")
    .select("image_path")
    .eq("listing_id", listing.id)
    .order("position", { ascending: true });

  const imageUrls = (images ?? [])
    .map((img) => getListingImageUrl(img.image_path))
    .filter((url): url is string => Boolean(url));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <PhotoGallery imageUrls={imageUrls} alt={listing.title} />
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-forest">
              {listing.title}
            </h1>
            <p className="mt-1 text-xl font-semibold text-forest">
              ${listing.price}
            </p>
          </div>
          {listing.description && (
            <p className="text-forest/70">{listing.description}</p>
          )}
          <dl className="grid grid-cols-2 gap-y-2 text-sm text-forest">
            <dt className="text-forest/50">Size</dt>
            <dd>{listing.size}</dd>
            <dt className="text-forest/50">Condition</dt>
            <dd>{conditionLabels[listing.condition]}</dd>
            <dt className="text-forest/50">Seller</dt>
            <dd className="flex items-center gap-2">
              {seller?.display_name ?? "Unknown"}
              {avgRating !== null && (
                <span className="flex items-center gap-0.5 text-xs text-forest/60">
                  <span className="text-sunflower">★</span>
                  {avgRating.toFixed(1)}
                  <span className="text-forest/40">
                    ({sellerReviews!.length})
                  </span>
                </span>
              )}
            </dd>
          </dl>

          {isOwnListing ? (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-sm text-forest/60">
                This is your own listing
                {listing.status === "sold" ? " (sold)." : "."}
              </p>
              <Link
                href={`/my-listings/${listing.id}/edit`}
                className="block w-full rounded-full bg-forest px-5 py-3 text-center font-medium text-cream hover:bg-forest/90"
              >
                Edit listing
              </Link>
            </div>
          ) : listing.status === "sold" ? (
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-full bg-forest/10 px-5 py-3 font-medium text-forest/40"
            >
              Sold
            </button>
          ) : user ? (
            <div className="mt-4">
              <BuyButton listingId={listing.id} />
            </div>
          ) : (
            <Link
              href="/login"
              className="mt-4 block w-full rounded-full bg-forest px-5 py-3 text-center font-medium text-cream hover:bg-forest/90"
            >
              Log in to buy
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
