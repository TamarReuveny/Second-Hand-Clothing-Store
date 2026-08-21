"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

export default function FavoriteButton({
  listingId,
  isFavorited: initial,
}: {
  listingId: string;
  isFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      await toggleFavorite(listingId, favorited);
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-label={favorited ? "Remove from saved" : "Save item"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-base shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
    >
      <span className={favorited ? "text-blush" : "text-forest/40"}>
        {favorited ? "♥" : "♡"}
      </span>
    </button>
  );
}
