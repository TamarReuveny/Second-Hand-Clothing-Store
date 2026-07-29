import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "@/components/BuyButton";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnListing = user?.id === listing.seller_id;
  const imageUrl = getListingImageUrl(listing.image_path);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="relative aspect-square w-full rounded-2xl bg-forest/5">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="rounded-2xl object-cover"
            />
          )}
        </div>
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
            <dd>{seller?.display_name ?? "Unknown"}</dd>
          </dl>

          {listing.status === "sold" ? (
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-full bg-forest/10 px-5 py-3 font-medium text-forest/40"
            >
              Sold
            </button>
          ) : isOwnListing ? (
            <p className="mt-4 text-sm text-forest/60">
              This is your own listing.
            </p>
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
