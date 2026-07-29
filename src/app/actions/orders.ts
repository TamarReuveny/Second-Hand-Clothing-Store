"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PurchaseState = { error: string } | undefined;

export async function purchaseListing(
  _prevState: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const listingId = String(formData.get("listingId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("purchase_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/items/${listingId}`);
  revalidatePath("/my-orders");
  redirect("/my-orders");
}
