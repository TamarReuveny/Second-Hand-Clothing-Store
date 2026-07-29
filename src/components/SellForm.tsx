"use client";

import { useActionState, useRef, useState } from "react";
import { createListing } from "@/app/actions/listings";

const CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
] as const;
const CONDITIONS = ["new", "like-new", "good", "fair"] as const;

const inputClasses =
  "rounded-lg border border-forest/20 bg-white/60 px-3 py-2 text-forest focus:border-teal focus:outline-none";

export default function SellForm() {
  const [state, formAction, pending] = useActionState(
    createListing,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
    setFileName(file?.name ?? null);
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="photo" className="text-sm font-medium">
          Photo
        </label>
        <input
          ref={fileInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          required
          onChange={handlePhotoChange}
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest/90"
          >
            Choose photo
          </button>
          <span className="text-sm text-forest/60">
            {fileName ?? "No photo selected"}
          </span>
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- ephemeral client-side blob: preview, not a real remote/optimizable image
          <img
            src={preview}
            alt="Preview"
            className="mt-2 h-40 w-40 rounded-lg object-cover"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input id="title" name="title" required className={inputClasses} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
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
            defaultValue=""
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
            defaultValue=""
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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-forest px-5 py-3 font-medium text-cream hover:bg-forest/90 disabled:opacity-50"
      >
        {pending ? "Publishing..." : "Publish listing"}
      </button>
    </form>
  );
}
