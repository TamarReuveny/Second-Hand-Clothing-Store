"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LISTING_IMAGES_BUCKET } from "@/lib/supabase/storage";
import {
  MAX_PHOTOS,
  parseListingFields,
  getNewPhotos,
} from "@/lib/listing-validation";

export type ListingFormState = { error: string } | undefined;

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
    .select("id, status")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  if (!existingListing) {
    return { error: "Listing not found." };
  }
  if (existingListing.status === "sold") {
    return { error: "Sold listings can't be edited." };
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

  const { data: listing } = await supabase
    .from("listings")
    .select("status")
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .single();

  // Sold listings have an order row pointing at them (orders.listing_id is
  // ON DELETE RESTRICT, to protect order history), so this delete would
  // fail at the database level anyway — bail out before attempting it.
  if (!listing || listing.status === "sold") {
    return;
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
