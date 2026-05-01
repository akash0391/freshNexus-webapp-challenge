import { cacheGet, cacheSet } from "./redis";
import type {
  NutriScoreGrade,
  OFFNutriments,
  OFFProduct,
  OFFSearchResponse,
} from "./types";

// world.openfoodfacts.org is used for single-product (barcode) lookups.
// Free-text search lives on search-a-licious (search.openfoodfacts.org) — the v2 /api/v2/search
// endpoint silently ignores `search_terms` and returns the unfiltered global set, so we can't use it.
const PRODUCT_API_URL = "https://world.openfoodfacts.org";
const SEARCH_API_URL = "https://search.openfoodfacts.org";
const CACHE_TTL_SECONDS = 60 * 30;
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

async function fetchOFF(url: string, init: RequestInit): Promise<Response> {
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

export type SearchError = "rate-limited" | "unavailable" | null;

export interface SearchResult {
  data: OFFSearchResponse;
  error: SearchError;
}

// search-a-licious response shape — fields differ from OFF v2 (`hits` not `products`,
// `brands` is an array, no `ingredients_text` by default).
interface SalHit {
  code: string;
  product_name?: string;
  brands?: string[] | string;
  image_url?: string;
  nutriscore_grade?: string;
  categories_tags?: string[];
  nutriments?: OFFNutriments;
  ingredients_text?: string;
}

interface SalResponse {
  hits?: SalHit[];
  count?: number;
  page?: number;
  page_size?: number;
  page_count?: number;
}

function mapHitToProduct(h: SalHit): OFFProduct {
  return {
    code: h.code,
    product_name: h.product_name,
    brands: Array.isArray(h.brands) ? h.brands.join(", ") : h.brands,
    image_url: h.image_url,
    nutriscore_grade: h.nutriscore_grade as NutriScoreGrade | undefined,
    categories_tags: h.categories_tags,
    nutriments: h.nutriments,
    ingredients_text: h.ingredients_text,
  };
}

// search-a-licious requires either `q` or `sort_by`. Combine free-text and category into a single
// Lucene-style query, and fall back to popularity sort when no filters are provided.
function buildSearchParams(
  q: string | undefined,
  category: string | undefined,
  page: number,
  pageSize: number,
): URLSearchParams {
  const params = new URLSearchParams();
  const parts: string[] = [];
  if (q) parts.push(q);
  if (category) parts.push(`categories_tags:"en:${category}"`);

  if (parts.length > 0) {
    params.set("q", parts.join(" "));
  } else {
    params.set("sort_by", "popularity_key");
  }
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("fields", PRODUCT_FIELDS);
  return params;
}

// Soft-fails to an empty result so the discover grid stays usable when search is rate-limiting or 5xx-ing.
// The `error` discriminator lets callers distinguish a real empty result from an upstream failure
// (so the UI can offer a Retry instead of "No products found").
// Only successful responses are cached — failure paths intentionally bypass cacheSet.
export async function searchProducts({
  q,
  category,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: SearchProductsOptions = {}): Promise<SearchResult> {
  // Cache key version bumped to v2 — v1 entries were poisoned by the broken /api/v2/search endpoint.
  const cacheKey = `off:search:v2:${q ?? ""}:${category ?? ""}:${page}:${pageSize}`;
  const cached = await cacheGet<OFFSearchResponse>(cacheKey);
  if (cached) return { data: cached.v, error: null };

  const params = buildSearchParams(q, category, page, pageSize);
  const empty = { ...EMPTY_SEARCH, page, page_size: pageSize };

  try {
    const res = await fetchOFF(`${SEARCH_API_URL}/search?${params.toString()}`, {
      headers: OFF_HEADERS,
      cache: "no-store",
    });

    if (res.status === 429) {
      console.warn("Open Food Facts search rate-limited; serving empty results");
      return { data: empty, error: "rate-limited" };
    }

    if (!res.ok) {
      throw new Error(
        `Open Food Facts search failed: ${res.status} ${res.statusText}`,
      );
    }

    const sal = (await res.json()) as SalResponse;
    const data: OFFSearchResponse = {
      count: sal.count ?? 0,
      page: sal.page ?? page,
      page_size: sal.page_size ?? pageSize,
      products: (sal.hits ?? []).map(mapHitToProduct),
    };
    await cacheSet(cacheKey, data, CACHE_TTL_SECONDS);
    return { data, error: null };
  } catch (err) {
    console.error("Open Food Facts search error:", err);
    return { data: empty, error: "unavailable" };
  }
}

interface ProductEnvelope {
  status: 0 | 1;
  status_verbose?: string;
  code: string;
  product?: OFFProduct;
}

// Returns null for genuine 404s; rethrows other failures so the product route falls through to error.tsx.
// Confirmed-null lookups are cached so we don't hammer OFF for known-missing barcodes.
export async function getProduct(barcode: string): Promise<OFFProduct | null> {
  const cacheKey = `off:product:v1:${barcode}`;
  const cached = await cacheGet<OFFProduct | null>(cacheKey);
  if (cached) return cached.v;

  const params = new URLSearchParams({ fields: PRODUCT_FIELDS });
  const url = `${PRODUCT_API_URL}/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?${params.toString()}`;

  const res = await fetchOFF(url, {
    headers: OFF_HEADERS,
    cache: "no-store",
  });

  if (res.status === 404) {
    await cacheSet<OFFProduct | null>(cacheKey, null, CACHE_TTL_SECONDS);
    return null;
  }
  if (!res.ok) {
    throw new Error(
      `Open Food Facts product fetch failed: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as ProductEnvelope;
  const product = data.status === 0 || !data.product ? null : data.product;
  await cacheSet<OFFProduct | null>(cacheKey, product, CACHE_TTL_SECONDS);
  return product;
}
