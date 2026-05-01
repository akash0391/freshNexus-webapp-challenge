"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchError } from "@/lib/openFoodFacts";
import type { OFFProduct, OFFSearchResponse } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

type Props = {
  initialProducts: OFFProduct[];
  totalCount: number;
  initialError?: SearchError;
  q?: string;
  category?: string;
};

type ApiResponse = OFFSearchResponse & { error?: SearchError };

export function InfiniteProductList({
  initialProducts,
  totalCount,
  initialError,
  q,
  category,
}: Props) {
  const [products, setProducts] = useState<OFFProduct[]>(initialProducts);
  const [loadedPages, setLoadedPages] = useState(
    initialProducts.length > 0 ? 1 : 0,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SearchError>(initialError ?? null);
  const [done, setDone] = useState(
    initialProducts.length > 0 && initialProducts.length >= totalCount,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  async function fetchNext() {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = loadedPages + 1;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("page", String(next));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/food?${params.toString()}`);
      const body = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || body?.error) {
        setError(body?.error === "rate-limited" ? "rate-limited" : "unavailable");
        return;
      }
      if (!body) {
        setError("unavailable");
        return;
      }

      const incoming = body.products ?? [];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.code));
        return [...prev, ...incoming.filter((p) => !seen.has(p.code))];
      });
      setLoadedPages(next);
      if (
        next * PAGE_SIZE >= body.count ||
        (incoming.length < PAGE_SIZE && body.count > 0)
      ) {
        setDone(true);
      }
      setError(null);
    } catch {
      setError("unavailable");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  function loadMore() {
    if (error) return;
    void fetchNext();
  }

  function retry() {
    setError(null);
    void fetchNext();
  }

  useEffect(() => {
    if (done || error) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // loadMore reads fresh closure vars each render; effect re-binds when guards change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, error, loadedPages]);

  return (
    <>
      {products.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.code}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      {products.length === 0 && !error && (
        <p className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No products found.
        </p>
      )}

      {error ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {error === "rate-limited"
              ? "Rate limit reached. Try again in a moment."
              : "Couldn't reach Open Food Facts. Try again."}
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : !done ? (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span className="text-sm text-zinc-500">
            {loading ? "Loading more…" : "Scroll for more"}
          </span>
        </div>
      ) : products.length > PAGE_SIZE ? (
        <p className="py-8 text-center text-xs text-zinc-500">
          End of results
        </p>
      ) : null}
    </>
  );
}

export default InfiniteProductList;
