"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart, removeFromCart } from "@/app/actions/cart";

export default function AddToCartButton({
  listingId,
  inCart,
}: {
  listingId: string;
  inCart: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(inCart);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setPending(true);
    setError(null);
    const result = await addToCart(listingId);
    if (result.error) {
      setError(result.error);
    } else {
      setAdded(true);
      router.refresh();
    }
    setPending(false);
  }

  async function handleRemove() {
    setPending(true);
    await removeFromCart(listingId);
    setAdded(false);
    router.refresh();
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {added ? (
        <div className="flex flex-col gap-2">
          <a
            href="/cart"
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-teal px-5 py-3 font-medium text-cream hover:bg-teal/90"
          >
            View cart ♥
          </a>
          <button
            onClick={handleRemove}
            disabled={pending}
            className="w-full rounded-full border border-forest/20 px-5 py-3 text-sm text-forest/60 hover:border-forest/40 hover:text-forest disabled:opacity-50"
          >
            Remove from cart
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          disabled={pending}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest px-5 py-3 font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
        >
          {pending ? "Adding..." : <>Add to cart <span aria-hidden>♥</span></>}
        </button>
      )}
    </div>
  );
}
