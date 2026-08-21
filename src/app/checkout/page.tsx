import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("listing_id")
    .eq("user_id", user.id);

  if (!cartItems?.length) redirect("/cart");

  const listingIds = cartItems.map((c) => c.listing_id);
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, price")
    .in("id", listingIds);

  const total = (listings ?? []).reduce((sum, l) => sum + l.price, 0);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl font-semibold text-forest">
        Checkout
      </h1>
      <p className="mb-8 text-sm text-forest/60">
        {cartItems.length} item{cartItems.length > 1 ? "s" : ""} · $
        {total.toFixed(2)} total
      </p>
      <CheckoutForm total={total} />
    </main>
  );
}
