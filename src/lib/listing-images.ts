import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getListingImageUrl } from "@/lib/supabase/storage";

export async function getCoverImageUrls(
  supabase: SupabaseClient<Database>,
  listingIds: string[],
): Promise<Map<string, string | null>> {
  const urlsById = new Map<string, string | null>();
  if (listingIds.length === 0) return urlsById;

  const { data } = await supabase
    .from("listing_images")
    .select("listing_id, image_path")
    .in("listing_id", listingIds)
    .eq("position", 0);

  for (const row of data ?? []) {
    urlsById.set(row.listing_id, getListingImageUrl(row.image_path));
  }

  return urlsById;
}
