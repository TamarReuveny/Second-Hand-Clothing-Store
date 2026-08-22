import type { Category, Condition } from "@/lib/supabase/types";

export const CATEGORIES: Category[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
];
export const CONDITIONS: Condition[] = ["new", "like-new", "good", "fair"];
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;

export type ParsedListingFields = {
  title: string;
  description: string;
  price: number;
  size: string;
  color: string;
  condition: Condition;
  category: Category;
};

export function parseListingFields(
  formData: FormData,
): ParsedListingFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const condition = String(formData.get("condition") ?? "") as Condition;
  const category = String(formData.get("category") ?? "") as Category;
  const price = Number(priceRaw);

  if (!title || !size) {
    return { error: "Title and size are required." };
  }
  if (!color) {
    return { error: "Please select a color." };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }
  if (!CONDITIONS.includes(condition)) {
    return { error: "Please choose a valid condition." };
  }
  if (!CATEGORIES.includes(category)) {
    return { error: "Please choose a valid category." };
  }

  return { title, description, price, size, color, condition, category };
}

export function getNewPhotos(formData: FormData): File[] | { error: string } {
  const photos = formData
    .getAll("photos")
    .filter((p): p is File => p instanceof File && p.size > 0);

  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) {
      return { error: "All photos must be image files." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "Each photo must be smaller than 5MB." };
    }
  }

  return photos;
}
