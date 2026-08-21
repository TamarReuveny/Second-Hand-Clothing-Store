"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(
  orderId: string,
  sellerId: string,
  rating: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5." };
  }

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    seller_id: sellerId,
    rating,
  });

  if (error) return { error: error.message };

  revalidatePath("/my-orders");
  return {};
}
