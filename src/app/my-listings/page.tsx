import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteListing } from "@/app/actions/listings";
import { getListingImageUrl } from "@/lib/supabase/storage";

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-forest">
          My listings
        </h1>
        <Link
          href="/sell"
          className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest/90"
        >
          + New listing
        </Link>
      </div>

      {!listings || listings.length === 0 ? (
        <p className="text-forest/60">
          You haven&apos;t listed anything yet.{" "}
          <Link href="/sell" className="underline">
            List your first item
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex items-center gap-4 rounded-xl border border-forest/10 bg-white/60 p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-forest/5">
                {getListingImageUrl(listing.image_path) && (
                  <Image
                    src={getListingImageUrl(listing.image_path)!}
                    alt={listing.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-forest">{listing.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      listing.status === "active"
                        ? "bg-teal-light text-teal"
                        : "bg-forest/10 text-forest/50"
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>
                <p className="text-sm text-forest/60">
                  ${listing.price} · Size {listing.size}
                </p>
              </div>
              <Link
                href={`/items/${listing.id}`}
                className="text-sm font-medium text-forest underline"
              >
                View
              </Link>
              <Link
                href={`/my-listings/${listing.id}/edit`}
                className="text-sm font-medium text-forest underline"
              >
                Edit
              </Link>
              <form action={deleteListing.bind(null, listing.id)}>
                <button
                  type="submit"
                  className="text-sm font-medium text-blush hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
