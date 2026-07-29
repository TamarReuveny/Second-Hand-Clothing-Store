const LISTING_IMAGES_BUCKET = "listing-images";

export function getListingImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${path}`;
}

export { LISTING_IMAGES_BUCKET };
