"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PurchaseState = { error: string } | undefined;

export async function completeCheckout(
  _prevState: PurchaseState,
  _formData: FormData,
): Promise<PurchaseState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("listing_id")
    .eq("user_id", user.id);

  if (!cartItems?.length) {
    return { error: "Your cart is empty." };
  }

  for (const item of cartItems) {
    const { error } = await supabase.rpc("purchase_listing", {
      p_listing_id: item.listing_id,
    });
    if (error) {
      return { error: `Could not purchase an item: ${error.message}` };
    }
  }

  await supabase.from("cart_items").delete().eq("user_id", user.id);

  revalidatePath("/");
  revalidatePath("/my-orders");
  revalidatePath("/cart");
  redirect("/my-orders");
}
