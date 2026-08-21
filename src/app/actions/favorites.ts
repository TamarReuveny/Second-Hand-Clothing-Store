"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavorite(listingId: string, isFavorited: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (isFavorited) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
  } else {
    await supabase.from("favorites").insert({
      user_id: user.id,
      listing_id: listingId,
    });
  }

  revalidatePath("/");
  revalidatePath("/my-favorites");
  revalidatePath(`/items/${listingId}`);
}
