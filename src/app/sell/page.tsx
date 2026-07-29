import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SellForm from "@/components/SellForm";

export default async function SellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold text-forest">
        List an item for sale
      </h1>
      <SellForm />
    </main>
  );
}
