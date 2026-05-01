"use client";

import { useEffect, useRef, useState } from "react";
import type { OFFProduct, OFFSearchResponse } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

type Props = {
  initialProducts: OFFProduct[];
  totalCount: number;
  q?: string;
  category?: string;
};

export function InfiniteProductList({
  initialProducts,
  totalCount,
  q,
  category,
}: Props) {
  const [products, setProducts] = useState<OFFProduct[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(
    initialProducts.length === 0 || initialProducts.length >= totalCount,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  async function loadMore() {
    if (loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const next = page + 1;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("page", String(next));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/food?${params.toString()}`);
      if (!res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json()) as OFFSearchResponse;
      const incoming = data.products ?? [];

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.code));
        const deduped = incoming.filter((p) => !seen.has(p.code));
        return [...prev, ...deduped];
      });
      setPage(next);

      if (incoming.length < PAGE_SIZE || next * PAGE_SIZE >= totalCount) {
        setDone(true);
      }
    } catch {
      setDone(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // loadMore captures fresh page/q/category each render; effect re-binds when guards change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, page]);

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
        No products found.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.code}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>

      {!done && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          <span className="text-sm text-zinc-500">
            {loading ? "Loading more…" : "Scroll for more"}
          </span>
        </div>
      )}

      {done && products.length > PAGE_SIZE && (
        <p className="py-8 text-center text-xs text-zinc-500">
          End of results
        </p>
      )}
    </>
  );
}

export default InfiniteProductList;
