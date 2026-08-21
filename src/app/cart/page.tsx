import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCoverImageUrls } from "@/lib/listing-images";
import { removeFromCart } from "@/app/actions/cart";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("id, listing_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const listingIds = (cartItems ?? []).map((c) => c.listing_id);

  const { data: listings } = listingIds.length
    ? await supabase
        .from("listings")
        .select("id, title, price, size, color, condition")
        .in("id", listingIds)
    : { data: [] };

  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]));
  const coverImageUrls = await getCoverImageUrls(supabase, listingIds);

  const total = (listings ?? []).reduce((sum, l) => sum + l.price, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-8 font-serif text-2xl font-semibold text-forest">
        Your cart
      </h1>

      {!cartItems || cartItems.length === 0 ? (
        <p className="text-forest/60">
          Your cart is empty.{" "}
          <Link href="/" className="underline">
            Browse listings
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {cartItems.map((cartItem) => {
              const listing = listingsById.get(cartItem.listing_id);
              if (!listing) return null;
              return (
                <div
                  key={cartItem.id}
                  className="flex items-center gap-4 rounded-xl border border-forest/10 bg-white/60 p-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-forest/5">
                    {coverImageUrls.get(cartItem.listing_id) && (
                      <Image
                        src={coverImageUrls.get(cartItem.listing_id)!}
                        alt={listing.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/items/${listing.id}`}
                      className="font-medium text-forest hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-sm text-forest/60">
                      ${listing.price} · Size {listing.size} · {listing.color}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await removeFromCart(cartItem.listing_id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-sm text-forest/40 hover:text-forest"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-forest/10 bg-white/60 p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="font-medium text-forest">Total</span>
              <span className="font-serif text-xl font-semibold text-forest">
                ${total.toFixed(2)}
              </span>
            </div>
            <Link
              href="/checkout"
              className="block w-full rounded-full bg-forest px-5 py-3 text-center font-medium text-cream hover:bg-forest/90"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
