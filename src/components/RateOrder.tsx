"use client";

import { useState } from "react";
import { submitReview } from "@/app/actions/reviews";

export default function RateOrder({
  orderId,
  sellerId,
}: {
  orderId: string;
  sellerId: string;
}) {
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleRate(rating: number) {
    setPending(true);
    const result = await submitReview(orderId, sellerId, rating);
    if (!result.error) {
      setSubmitted(true);
    }
    setPending(false);
  }

  if (submitted) {
    return <p className="text-xs text-forest/50">Thanks for rating!</p>;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-forest/50">Rate seller:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={pending}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-lg leading-none disabled:opacity-50"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <span className={hovered >= star ? "text-sunflower" : "text-forest/20"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
