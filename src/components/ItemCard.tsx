import Link from "next/link";
import Image from "next/image";
import type { ListingRow, Category } from "@/lib/supabase/types";
import FavoriteButton from "@/components/FavoriteButton";

const conditionLabels: Record<ListingRow["condition"], string> = {
  new: "New",
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
};

const categoryColors: Record<Category, string> = {
  tops: "bg-blush-light text-blush",
  bottoms: "bg-sunflower-light text-sunflower",
  dresses: "bg-lavender-light text-lavender",
  outerwear: "bg-teal-light text-teal",
  shoes: "bg-blush-light text-blush",
  accessories: "bg-lavender-light text-lavender",
};

export default function ItemCard({
  listing,
  imageUrl,
  isFavorited,
}: {
  listing: ListingRow;
  imageUrl: string | null;
  isFavorited?: boolean;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white/60 transition-shadow hover:shadow-md">
      <Link href={`/items/${listing.id}`} className="flex flex-col">
        <div className="relative aspect-square w-full bg-forest/5">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          )}
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColors[listing.category]}`}
          >
            {listing.category}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium leading-tight text-forest group-hover:underline">
              {listing.title}
            </h3>
            <span className="whitespace-nowrap font-semibold text-forest">
              ${listing.price}
            </span>
          </div>
          <p className="text-sm text-forest/60">
            Size {listing.size} · {conditionLabels[listing.condition]}
          </p>
        </div>
      </Link>
      {isFavorited !== undefined && (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={listing.id} isFavorited={isFavorited} />
        </div>
      )}
    </div>
  );
}
