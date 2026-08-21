"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createListing, updateListing } from "@/app/actions/listings";
import { getListingImageUrl } from "@/lib/supabase/storage";
import type { ListingImageRow, ListingRow } from "@/lib/supabase/types";

const CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
] as const;
const CONDITIONS = ["new", "like-new", "good", "fair"] as const;
const COLORS = [
  "Black", "White", "Grey", "Beige", "Brown",
  "Red", "Pink", "Orange", "Yellow",
  "Green", "Teal", "Blue", "Navy", "Purple",
  "Multicolor",
] as const;
const MAX_PHOTOS = 6;

const inputClasses =
  "rounded-lg border border-forest/20 bg-white/60 px-3 py-2 text-forest focus:border-teal focus:outline-none";

export default function SellForm({
  listing,
  existingImages = [],
}: {
  listing?: ListingRow;
  existingImages?: ListingImageRow[];
}) {
  const isEditing = Boolean(listing);
  const action = listing
    ? updateListing.bind(null, listing.id)
    : createListing;
  const [state, formAction, pending] = useActionState(action, undefined);

  const [selectedColor, setSelectedColor] = useState<string>(listing?.color ?? "");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const keptExisting = existingImages.filter((img) => !removedIds.has(img.id));
  const totalPhotos = keptExisting.length + newFiles.length;

  function handleAddFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setNewFiles((prev) => [...prev, ...files].slice(0, MAX_PHOTOS));
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExisting(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
  }

  // Keep the actual <input type="file"> in sync with our state so the
  // form submits exactly the files the user sees in the preview grid.
  useEffect(() => {
    if (!fileInputRef.current) return;
    const dt = new DataTransfer();
    newFiles.forEach((file) => dt.items.add(file));
    fileInputRef.current.files = dt.files;
  }, [newFiles]);

  const newFilePreviews = newFiles.map((file) => URL.createObjectURL(file));

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Photos ({totalPhotos}/{MAX_PHOTOS})
        </label>
        <input
          ref={fileInputRef}
          name="photos"
          type="file"
          accept="image/*"
          multiple
          required={!isEditing && totalPhotos === 0}
          onChange={handleAddFiles}
          className="hidden"
        />
        {removedIds.size > 0 &&
          [...removedIds].map((id) => (
            <input key={id} type="hidden" name="removeImages" value={id} />
          ))}

        <div className="flex flex-wrap gap-2">
          {keptExisting.map((img) => {
            const url = getListingImageUrl(img.image_path);
            return (
              <div
                key={img.id}
                className="relative h-20 w-20 overflow-hidden rounded-lg bg-forest/5"
              >
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element -- small local preview grid, not worth next/image overhead
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeExisting(img.id)}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest/80 text-xs text-cream hover:bg-forest"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            );
          })}
          {newFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative h-20 w-20 overflow-hidden rounded-lg bg-forest/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral client-side blob: preview */}
              <img
                src={newFilePreviews[index]}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeNewFile(index)}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest/80 text-xs text-cream hover:bg-forest"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          {totalPhotos < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-forest/30 text-forest/60 hover:border-forest/60 hover:text-forest"
            >
              <span className="text-xl leading-none">+</span>
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={listing?.title}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={listing?.description}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium">
            Price ($)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={listing?.price}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="size" className="text-sm font-medium">
            Size
          </label>
          <input
            id="size"
            name="size"
            required
            placeholder="e.g. M, 42, One size"
            defaultValue={listing?.size}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={listing?.category ?? ""}
            className={inputClasses}
          >
            <option value="" disabled>
              Choose...
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="condition" className="text-sm font-medium">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            required
            defaultValue={listing?.condition ?? ""}
            className={inputClasses}
          >
            <option value="" disabled>
              Choose...
            </option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Color <span className="text-red-500">*</span>
        </label>
        <input type="hidden" name="color" value={selectedColor} />
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c === selectedColor ? "" : c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedColor === c
                  ? "border-forest bg-forest text-cream"
                  : "border-forest/20 text-forest hover:border-forest/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-forest px-5 py-3 font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
      >
        {pending
          ? isEditing
            ? "Saving..."
            : "Publishing..."
          : isEditing
            ? "Save changes"
            : "Publish listing"}
      </button>
    </form>
  );
}
