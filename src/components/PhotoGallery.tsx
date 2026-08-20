"use client";

import { useState } from "react";
import Image from "next/image";

export default function PhotoGallery({
  imageUrls,
  alt,
}: {
  imageUrls: string[];
  alt: string;
}) {
  const [selected, setSelected] = useState(0);

  if (imageUrls.length === 0) {
    return <div className="aspect-square w-full rounded-2xl bg-forest/5" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-forest/5">
        <Image
          src={imageUrls[selected]}
          alt={alt}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ${
                index === selected
                  ? "ring-2 ring-forest"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
