import Image from "next/image";
import Link from "next/link";
import type { OFFProduct, NutriScoreGrade } from "@/lib/types";

const NUTRISCORE_STYLES: Record<NutriScoreGrade, string> = {
  a: "bg-green-600 text-white",
  b: "bg-lime-500 text-white",
  c: "bg-yellow-400 text-black",
  d: "bg-orange-500 text-white",
  e: "bg-red-600 text-white",
  unknown: "bg-zinc-300 text-black",
};

function NutriScoreBadge({ grade }: { grade?: NutriScoreGrade }) {
  const resolved: NutriScoreGrade = grade ?? "unknown";
  const label = resolved === "unknown" ? "?" : resolved.toUpperCase();
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${NUTRISCORE_STYLES[resolved]}`}
      aria-label={`Nutri-Score ${label}`}
      title={`Nutri-Score ${label}`}
    >
      {label}
    </span>
  );
}

export function ProductCard({ product }: { product: OFFProduct }) {
  const name = product.product_name?.trim() || "Unnamed product";
  const brand = product.brands?.split(",")[0]?.trim();

  return (
    <article className="group flex flex-col rounded-lg border border-black/10 bg-white overflow-hidden transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900">
      <Link href={`/product/${product.code}`} className="flex flex-col h-full">
        <div className="relative aspect-square bg-zinc-50 dark:bg-zinc-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-2"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug">
              {name}
            </h3>
            <NutriScoreBadge grade={product.nutriscore_grade} />
          </div>
          {brand && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
              {brand}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
