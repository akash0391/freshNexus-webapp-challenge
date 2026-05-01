import type { OFFProduct, OFFSearchResponse } from "./types";

const BASE_URL = "https://world.openfoodfacts.org";
const REVALIDATE_SECONDS = 3600;
const DEFAULT_PAGE_SIZE = 24;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4000;

const OFF_HEADERS = {
  "User-Agent":
    "FreshNexus/0.1 (https://github.com/akash0391/freshnexus-webapp-challenge; theakashyadav.dev@gmail.com)",
};

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

const EMPTY_SEARCH: OFFSearchResponse = {
  count: 0,
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  products: [],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

async function fetchOFF(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } },
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, init);
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= MAX_RETRIES) return res;

    const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
    const wait = retryAfter ?? backoff;
    await sleep(wait);
    attempt += 1;
  }
}

export interface SearchProductsOptions {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

// Soft-fails to an empty result so the discover grid stays usable when OFF is rate-limiting or 5xx-ing.
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

  try {
    const res = await fetchOFF(`${BASE_URL}/api/v2/search?${params.toString()}`, {
      headers: OFF_HEADERS,
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (res.status === 429) {
      console.warn("Open Food Facts search rate-limited; serving empty results");
      return { ...EMPTY_SEARCH, page, page_size: pageSize };
    }

    if (!res.ok) {
      throw new Error(
        `Open Food Facts search failed: ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as OFFSearchResponse;
  } catch (err) {
    console.error("Open Food Facts search error:", err);
    return { ...EMPTY_SEARCH, page, page_size: pageSize };
  }
}

interface ProductEnvelope {
  status: 0 | 1;
  status_verbose?: string;
  code: string;
  product?: OFFProduct;
}

// Returns null for genuine 404s; rethrows other failures so the product route falls through to error.tsx.
export async function getProduct(barcode: string): Promise<OFFProduct | null> {
  const params = new URLSearchParams({ fields: PRODUCT_FIELDS });
  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?${params.toString()}`;

  const res = await fetchOFF(url, {
    headers: OFF_HEADERS,
    cache: "force-cache",
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
