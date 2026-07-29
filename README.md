# ReWear — Second-Hand Clothing Marketplace

A marketplace for buying and selling second-hand clothing. Built for the
RUNI CS 2026 Internet Technologies final project.

**Live app:** https://second-hand-clothing-store.vercel.app

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Supabase](https://supabase.com) — Postgres database, Auth, and Storage
- Tailwind CSS
- Deployed on [Vercel](https://vercel.com)

## Running locally

### 1. Clone and install

```bash
git clone https://github.com/TamarReuveny/Second-Hand-Clothing-Store.git
cd Second-Hand-Clothing-Store
npm install
```

### 2. Set up a Supabase project

Create a free project at [supabase.com](https://supabase.com), then run the
SQL migrations in `supabase/migrations/` **in order** via the Supabase SQL
Editor (Dashboard → SQL Editor → New query → paste → Run):

1. `0001_init.sql` — core schema (profiles, listings, orders, RLS policies)
2. `0002_listing_photos.sql` — listing photo storage bucket + policies

In **Authentication → Sign In / Providers → Email**, turn off "Confirm
email" for frictionless local testing (or leave it on and confirm signups
via the email link).

### 3. Environment variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Both values are in your Supabase project's **Settings → API** page. The
anon/publishable key is safe to expose client-side — never use the
`service_role` key here.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app/` — pages and routes (App Router)
- `src/app/actions/` — server actions (auth, listings, orders)
- `src/components/` — shared UI components
- `src/lib/supabase/` — Supabase client setup, DB types, storage helpers
- `supabase/migrations/` — SQL schema and RLS policy migrations
- `docs/` — product spec and other project documentation
