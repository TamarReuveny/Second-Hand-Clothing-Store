import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SellForm from "@/components/SellForm";

export default async function EditListingPage(
  props: PageProps<"/my-listings/[id]/edit">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if (!listing) {
    notFound();
  }

  if (listing.status === "sold") {
    redirect("/my-listings");
  }

  const { data: existingImages } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", id)
    .order("position", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold text-forest">
        Edit listing
      </h1>
      <SellForm listing={listing} existingImages={existingImages ?? []} />
    </main>
  );
}
