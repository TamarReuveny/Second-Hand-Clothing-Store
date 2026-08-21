import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import Logo from "@/components/Logo";
import SearchInput from "@/components/SearchInput";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let cartCount = 0;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? user.email ?? null;

    const { count } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    cartCount = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-forest/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Logo />
          </Link>
          <SearchInput />
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium text-forest">
          <Link href="/" className="hover:text-teal">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/sell" className="hover:text-teal">
                Sell
              </Link>
              <Link href="/my-listings" className="hover:text-teal">
                My listings
              </Link>
              <Link href="/my-orders" className="hover:text-teal">
                My orders
              </Link>
              <Link href="/cart" className="relative hover:text-teal">
                Cart
                {cartCount > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blush text-xs font-semibold text-forest">
                    {cartCount}
                  </span>
                )}
              </Link>
              <span className="text-forest/60">{displayName}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-forest/20 px-4 py-2 hover:bg-forest/5"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signup" className="hover:text-teal">
                Sign up
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-cream hover:bg-forest/90"
              >
                Log in <span aria-hidden>♥</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
