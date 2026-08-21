"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addToCart(listingId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cart_items")
    .insert({ user_id: user.id, listing_id: listingId });

  if (error) return { error: error.message };

  revalidatePath(`/items/${listingId}`);
  revalidatePath("/cart");
  return {};
}

export async function removeFromCart(listingId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId);

  revalidatePath("/cart");
  revalidatePath(`/items/${listingId}`);
}
