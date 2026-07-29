"use client";

import { useActionState } from "react";
import { purchaseListing } from "@/app/actions/orders";

export default function BuyButton({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(
    purchaseListing,
    undefined,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      {state?.error && (
        <p className="mb-2 text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest px-5 py-3 font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
      >
        {pending ? "Processing..." : (
          <>
            Buy now <span aria-hidden>♥</span>
          </>
        )}
      </button>
    </form>
  );
}
