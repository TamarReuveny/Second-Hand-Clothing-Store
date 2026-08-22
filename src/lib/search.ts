export const CATEGORY_SYNONYMS: Record<string, string> = {
  pants: "bottoms",
  trousers: "bottoms",
  jeans: "bottoms",
  skirt: "bottoms",
  shorts: "bottoms",
  shirt: "tops",
  blouse: "tops",
  tee: "tops",
  top: "tops",
  jacket: "outerwear",
  coat: "outerwear",
  sneakers: "shoes",
  boots: "shoes",
  heels: "shoes",
  sandals: "shoes",
  belt: "accessories",
  bag: "accessories",
  hat: "accessories",
  scarf: "accessories",
  dress: "dresses",
};

/** Resolves a free-text search term to a category name if one of its
 * known synonyms matches, otherwise returns the term unchanged so it
 * still matches against the title. */
export function resolveCategorySynonym(term: string): string {
  return CATEGORY_SYNONYMS[term.toLowerCase()] ?? term;
}
