"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LISTING_IMAGES_BUCKET } from "@/lib/supabase/storage";
import type { Category, Condition } from "@/lib/supabase/types";

const CATEGORIES: Category[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
];
const CONDITIONS: Condition[] = ["new", "like-new", "good", "fair"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export type ListingFormState = { error: string } | undefined;

type ParsedFields = {
  title: string;
  description: string;
  price: number;
  size: string;
  condition: Condition;
  category: Category;
};

function parseListingFields(formData: FormData): ParsedFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const condition = String(formData.get("condition") ?? "") as Condition;
  const category = String(formData.get("category") ?? "") as Category;
  const price = Number(priceRaw);

  if (!title || !size) {
    return { error: "Title and size are required." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }
  if (!CONDITIONS.includes(condition)) {
    return { error: "Please choose a valid condition." };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "Please choose a valid category." };
  }

  return { title, description, price, size, condition, category };
}

export async function createListing(
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fields = parseListingFields(formData);
  if ("error" in fields) {
    return fields;
  }

  const photo = formData.get("photo");

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Please add a photo of the item." };
  }
  if (!photo.type.startsWith("image/")) {
    return { error: "Photo must be an image file." };
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return { error: "Photo must be smaller than 5MB." };
  }

  const extension = photo.name.split(".").pop() || "jpg";
  const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .upload(imagePath, photo, { contentType: photo.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.from("listings").insert({
    seller_id: user.id,
    ...fields,
    image_path: imagePath,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/my-listings");
  redirect("/my-listings");
}

export async function updateListing(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existing } = await supabase
    .from("listings")
    .select("id, image_path")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  if (!existing) {
    return { error: "Listing not found." };
  }

  const fields = parseListingFields(formData);
  if ("error" in fields) {
    return fields;
  }

  const photo = formData.get("photo");
  let imagePath = existing.image_path;
  let oldImagePath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) {
      return { error: "Photo must be an image file." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "Photo must be smaller than 5MB." };
    }

    const extension = photo.name.split(".").pop() || "jpg";
    const newImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(newImagePath, photo, { contentType: photo.type });

    if (uploadError) {
      return { error: uploadError.message };
    }

    oldImagePath = imagePath;
    imagePath = newImagePath;
  }

  const { error } = await supabase
    .from("listings")
    .update({ ...fields, image_path: imagePath })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (oldImagePath) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove([oldImagePath]);
  }

  revalidatePath("/");
  revalidatePath("/my-listings");
  revalidatePath(`/items/${listingId}`);
  redirect("/my-listings");
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("image_path")
    .eq("id", listingId)
    .single();

  await supabase.from("listings").delete().eq("id", listingId);

  if (listing?.image_path) {
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove([listing.image_path]);
  }

  revalidatePath("/");
  revalidatePath("/my-listings");
}
