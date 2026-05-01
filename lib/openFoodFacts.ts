import type { OFFProduct, OFFSearchResponse } from "./types";

const BASE_URL = "https://world.openfoodfacts.org";
const REVALIDATE_SECONDS = 3600;
const DEFAULT_PAGE_SIZE = 24;

const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_url",
  "nutriscore_grade",
  "categories_tags",
  "nutriments",
  "ingredients_text",
].join(",");

export interface SearchProductsOptions {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export async function searchProducts({
  q,
  category,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: SearchProductsOptions = {}): Promise<OFFSearchResponse> {
  const params = new URLSearchParams();
  if (q) params.set("search_terms", q);
  if (category) params.set("categories_tags_en", category);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("fields", PRODUCT_FIELDS);

  const res = await fetch(`${BASE_URL}/api/v2/search?${params.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(
      `Open Food Facts search failed: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as OFFSearchResponse;
}

interface ProductEnvelope {
  status: 0 | 1;
  status_verbose?: string;
  code: string;
  product?: OFFProduct;
}

export async function getProduct(barcode: string): Promise<OFFProduct | null> {
  const params = new URLSearchParams({ fields: PRODUCT_FIELDS });
  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?${params.toString()}`;

  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `Open Food Facts product fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as ProductEnvelope;
  if (data.status === 0 || !data.product) return null;
  return data.product;
}
