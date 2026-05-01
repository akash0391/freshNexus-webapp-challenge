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
  // search-a-licious caps `count` at 10,000 and sets this to false when truncated.
  is_count_exact?: boolean;
}

function mapHitToProduct(h: SalHit): OFFProduct {
  return {
    code: h.code,
    product_name: h.product_name,
    brands: Array.isArray(h.brands) ? h.brands.join(", ") : h.brands,
    image_url: normalizeImageUrl(h.image_url),
    nutriscore_grade: h.nutriscore_grade as NutriScoreGrade | undefined,
    categories_tags: h.categories_tags,
    nutriments: h.nutriments,
    ingredients_text: h.ingredients_text,
  };
}

// Empty-state-only quality clause: popularity_key alone surfaces synthetic test entries with
// fake short barcodes (679, 959, ...) whose advertised images don't exist on any OFF host. We
// only inject this when the user hasn't typed anything and hasn't picked a category — once a
// real filter is in play we honour it exactly so search/category results are not silently
// narrowed.
const EMPTY_STATE_QUALITY_FILTER =
  'states_tags:"en:front-photo-selected" AND states_tags:"en:product-name-completed"';

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
    params.set("q", parts.join(" AND "));
  } else {
    params.set("q", EMPTY_STATE_QUALITY_FILTER);
    params.set("sort_by", "popularity_key");
  }
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  params.set("fields", PRODUCT_FIELDS);
  return params;
}

// images.openfoodfacts.org has unreliable IPv4 routing from many networks (including Vercel's
// edge). The same images are served from world.openfoodfacts.org under the identical /images/
// path, so we rewrite hosts at the boundary to keep <Image> requests on a reachable origin.
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  return url.replace(
    /^https?:\/\/(?:images|static)\.openfoodfacts\.org\//,
    "https://world.openfoodfacts.org/",
  );
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
  // v5 — empty-state grid now includes a quality clause so synthetic-barcode entries with no real
  // image stop dominating the default view; cached v4 entries for the empty state are stale.
  const cacheKey = `off:search:v5:${q ?? ""}:${category ?? ""}:${page}:${pageSize}`;
  const cached = await cacheGet<OFFSearchResponse>(cacheKey);
  if (cached) return { data: await withTrueCount(cached.v, q, category), error: null };

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
      is_count_exact: sal.is_count_exact ?? true,
      page: sal.page ?? page,
      page_size: sal.page_size ?? pageSize,
      products: (sal.hits ?? []).map(mapHitToProduct),
    };
    await cacheSet(cacheKey, data, CACHE_TTL_SECONDS);
    return { data: await withTrueCount(data, q, category), error: null };
  } catch (err) {
    console.error("Open Food Facts search error:", err);
    return { data: empty, error: "unavailable" };
  }
}

// Search-a-licious caps `count` at 10,000. When there's no free-text query we can ask the v2
// API for the real total (v2 ignores `search_terms` but honours category tags). The override
// happens at *read* time so a search response cached during a v2 outage still gets the true
// count on the next read once v2 (or its 24h-cached value) is available.
async function withTrueCount(
  data: OFFSearchResponse,
  q: string | undefined,
  category: string | undefined,
): Promise<OFFSearchResponse> {
  if (q || data.is_count_exact) return data;
  const trueCount = await getTrueCount(category);
  if (trueCount == null) return data;
  return { ...data, count: trueCount, is_count_exact: true };
}

// world v2 returns the real total even when search-a-licious caps at 10k. It silently ignores
// free-text `search_terms` (per the comment on PRODUCT_API_URL above), so we only call it for
// the no-text, optional-category case. Cached for 24h — the global total moves slowly.
const TRUE_COUNT_TTL_SECONDS = 60 * 60 * 24;
async function getTrueCount(category: string | undefined): Promise<number | null> {
  const cacheKey = `off:truecount:v1:${category ?? ""}`;
  const cached = await cacheGet<number>(cacheKey);
  if (cached) return cached.v;

  const params = new URLSearchParams({ fields: "code", page_size: "1" });
  if (category) params.set("categories_tags_en", category);

  try {
    const res = await fetchOFF(
      `${PRODUCT_API_URL}/api/v2/search?${params.toString()}`,
      { headers: OFF_HEADERS, cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { count?: number };
    if (typeof body.count !== "number") return null;
    await cacheSet(cacheKey, body.count, TRUE_COUNT_TTL_SECONDS);
    return body.count;
  } catch {
    return null;
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
  // v2 — image_url is now rewritten to world.openfoodfacts.org at the boundary.
  const cacheKey = `off:product:v2:${barcode}`;
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
  const raw = data.status === 0 || !data.product ? null : data.product;
  const product = raw
    ? { ...raw, image_url: normalizeImageUrl(raw.image_url) }
    : null;
  await cacheSet<OFFProduct | null>(cacheKey, product, CACHE_TTL_SECONDS);
  return product;
}
