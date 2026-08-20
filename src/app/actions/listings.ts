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
const MAX_PHOTOS = 6;

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

function getNewPhotos(formData: FormData): File[] | { error: string } {
  const photos = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0);

  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) {
      return { error: "All photos must be image files." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "Each photo must be smaller than 5MB." };
    }
  }

  return photos;
}

async function uploadPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  photos: File[],
): Promise<{ paths: string[] } | { error: string }> {
  const uploadedPaths: string[] = [];

  for (const photo of photos) {
    const extension = photo.name.split(".").pop() || "jpg";
    const imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(imagePath, photo, { contentType: photo.type });

    if (uploadError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploadedPaths);
      }
      return { error: uploadError.message };
    }

    uploadedPaths.push(imagePath);
  }

  return { paths: uploadedPaths };
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

  const photos = getNewPhotos(formData);
  if ("error" in photos) {
    return photos;
  }
  if (photos.length === 0) {
    return { error: "Please add at least one photo of the item." };
  }
  if (photos.length > MAX_PHOTOS) {
    return { error: `You can upload up to ${MAX_PHOTOS} photos.` };
  }

  const uploaded = await uploadPhotos(supabase, user.id, photos);
  if ("error" in uploaded) {
    return uploaded;
  }

  const { data: newListing, error } = await supabase
    .from("listings")
    .insert({ seller_id: user.id, ...fields })
    .select("id")
    .single();

  if (error || !newListing) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploaded.paths);
    return { error: error?.message ?? "Failed to create listing." };
  }

  const { error: imagesError } = await supabase.from("listing_images").insert(
    uploaded.paths.map((image_path, position) => ({
      listing_id: newListing.id,
      image_path,
      position,
    })),
  );

  if (imagesError) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploaded.paths);
    await supabase.from("listings").delete().eq("id", newListing.id);
    return { error: imagesError.message };
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

  const { data: existingListing } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  if (!existingListing) {
    return { error: "Listing not found." };
  }

  const fields = parseListingFields(formData);
  if ("error" in fields) {
    return fields;
  }

  const { data: existingImages } = await supabase
    .from("listing_images")
    .select("id, image_path")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });

  const removeIds = new Set(formData.getAll("removeImages").map(String));
  const keptImages = (existingImages ?? []).filter((img) => !removeIds.has(img.id));
  const imagesToDelete = (existingImages ?? []).filter((img) => removeIds.has(img.id));

  const newPhotos = getNewPhotos(formData);
  if ("error" in newPhotos) {
    return newPhotos;
  }

  const totalPhotos = keptImages.length + newPhotos.length;
  if (totalPhotos === 0) {
    return { error: "A listing needs at least one photo." };
  }
  if (totalPhotos > MAX_PHOTOS) {
    return { error: `You can have up to ${MAX_PHOTOS} photos.` };
  }

  const uploaded = await uploadPhotos(supabase, user.id, newPhotos);
  if ("error" in uploaded) {
    return uploaded;
  }

  const { error } = await supabase
    .from("listings")
    .update(fields)
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) {
    if (uploaded.paths.length) {
      await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploaded.paths);
    }
    return { error: error.message };
  }

  if (imagesToDelete.length) {
    await supabase
      .from("listing_images")
      .delete()
      .in(
        "id",
        imagesToDelete.map((img) => img.id),
      );
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove(imagesToDelete.map((img) => img.image_path));
  }

  // Removing a photo can leave gaps (e.g. position 0 removed, 1 kept), so
  // renumber the kept images contiguously before appending new ones —
  // otherwise "position 0" (used for cover thumbnails) can end up pointing
  // at nothing.
  await Promise.all(
    keptImages.map((img, i) =>
      supabase.from("listing_images").update({ position: i }).eq("id", img.id),
    ),
  );

  if (uploaded.paths.length) {
    await supabase.from("listing_images").insert(
      uploaded.paths.map((image_path, i) => ({
        listing_id: listingId,
        image_path,
        position: keptImages.length + i,
      })),
    );
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

  const { data: images } = await supabase
    .from("listing_images")
    .select("image_path")
    .eq("listing_id", listingId);

  await supabase.from("listings").delete().eq("id", listingId);

  if (images?.length) {
    await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove(images.map((img) => img.image_path));
  }

  revalidatePath("/");
  revalidatePath("/my-listings");
}
