# FreshNexus

A small Next.js 16 reference app that surfaces food-product nutrition from
[Open Food Facts](https://world.openfoodfacts.org) and live FX reference rates
from [Frankfurter](https://frankfurter.dev). Three pages, fully server-rendered,
SEO-first.

## Live demo

- **Production:** https://freshnexus-webapp.vercel.app/
- **Repo:** https://github.com/akash0391/freshnexus-webapp-challenge.git

## Pages

1. **`/` Discover** — search by name and filter by category, paginated grid of products.
2. **`/product/[barcode]` Product detail** — image, Nutri-Score, nutrition table, ingredients, categories, JSON-LD `Product` schema.
3. **`/insights` Market Insights** — about copy plus a live FX rates table (USD → EUR/GBP/INR/JPY).

Plus `sitemap.xml`, `robots.txt`, and a typed 404 for missing barcodes.

## Run locally

```bash
pnpm install
pnpm dev
```

Visit <http://localhost:3000>.

Production build:

```bash
pnpm build
pnpm start
```

Optional environment variables:

- `NEXT_PUBLIC_SITE_URL` — canonical origin used by `metadata`, `sitemap.ts`,
  and `robots.ts`. Defaults to `http://localhost:3000`. Set this in Vercel to
  the production URL so canonical and OG links resolve correctly.

## Architecture choices

### Server Components by default

Every route is an `async` Server Component. Data is fetched on the server,
HTML ships pre-rendered, and there is no client-side waterfall for the
content that matters to crawlers. The only `"use client"` boundaries are the
two URL-driven controls (`SearchBar`, `CategoryFilter`) — they read/write
`searchParams` via `useRouter`, which has to live on the client. The page
itself stays a Server Component, so the product grid still renders in the
initial HTML response.

This was the obvious shape given the brief: SEO matters, the pages are
read-only, and there's no auth or per-user state to worry about.

### ISR via `fetch` cache

Persistence here is the Next.js fetch cache. There is no database — the data
is read-only and lives upstream. Each fetch declares its own revalidation
window so we get fresh-enough data without hammering the upstream APIs:

| Source | Function | `revalidate` | Why |
| --- | --- | --- | --- |
| Open Food Facts search | `searchProducts` | 3600 s | Catalog drifts slowly; one-hour staleness is fine. |
| Open Food Facts product | `getProduct` | 3600 s | Same data shape, same cadence; also dedupes the call shared between `generateMetadata` and the page. |
| Frankfurter latest | `getRates` | 60 s | Source publishes at most once per business day, but we want the "live" feel without overcaching. |

This means most page hits never reach the upstream API — they're served from
the on-disk cache that Next builds during ISR. The same `fetch` call inside
`generateMetadata` and the page component is automatically deduped within a
request, so the product detail page hits Open Food Facts at most once per
render even though the data is read in two places.

### SEO checklist

- `<html lang="en">` set in the root layout.
- `metadata` exported on every route, with a `title.template` so each page
  gets `"<page> | FreshNexus"`. Product pages set their title and
  description from the upstream payload via `generateMetadata`.
- `metadataBase` set so relative `openGraph.images` resolve to absolute URLs.
- `app/sitemap.ts` lists `/`, `/insights`, and a handful of featured product
  barcodes. `app/robots.ts` points crawlers at it.
- JSON-LD `Product` schema injected on the product detail page (name, image,
  brand, gtin13, category) for rich-result eligibility.
- Semantic HTML throughout: `<header>`, `<nav>`, `<main>`, `<article>`,
  `<section>` with `aria-labelledby`, real `<table>`/`<caption>` markup on
  insights, `<label>`/`aria-label` on form controls.
- Missing barcodes hit `notFound()` which renders `not-found.tsx` and sets
  `robots: { index: false }` on the metadata.
- `next/image` is used for all remote imagery with explicit sizes/`fill` and
  `priority` on the product hero (LCP).

## APIs used

- **Open Food Facts v2** (`world.openfoodfacts.org/api/v2`). Free, no key,
  covers both search and barcode lookup. We send a descriptive `User-Agent`
  per their guidelines and only ask for the fields we render.
- **Frankfurter v1** (`api.frankfurter.dev/v1`). Free, no key, republishes
  ECB reference rates as plain JSON — exactly the shape we need for the
  insights table without negotiating an API key.

Both are public, both have generous rate limits, and neither requires a
secret to deploy — which keeps the Vercel setup to a single click.

## What I'd do with more time

- **Pagination & infinite scroll** on the discover grid (server component
  + `<Link>` for SEO-friendly pages, then progressive enhancement).
- **Streaming the grid** behind `<Suspense>` so the header/search render
  instantly while the API call resolves.
- **Persist favorites** in a lightweight KV (Upstash / Vercel KV) keyed by
  cookie — would justify introducing real persistence beyond the fetch cache.
- **Better empty/error states** — the discover page currently shows a generic
  empty state; a "did you mean…" or category suggestions would feel less dead.
- **Open Graph image generation** via `opengraph-image.tsx` for product pages,
  composing brand + Nutri-Score over the product image.
- **Tests**: Playwright smoke covering the three routes plus a unit test for
  the OFF/Frankfurter clients with `msw`.
- **Telemetry**: Vercel Analytics + a basic Sentry hookup so 5xx from
  upstream APIs don't disappear silently.
