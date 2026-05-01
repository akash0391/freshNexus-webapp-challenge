import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IngredientList } from "@/components/IngredientList";
import { Nutriments } from "@/components/Nutriments";
import { NUTRISCORE_STYLES, nutriScoreLabel } from "@/lib/nutriscore";
import { getProduct } from "@/lib/openFoodFacts";
import type { OFFProduct } from "@/lib/types";

type Props = {
  params: Promise<{ barcode: string }>;
};

function categoryLabels(tags: string[] | undefined, max = 3): string[] {
  return (tags ?? [])
    .map((tag) => {
      const label = tag.includes(":") ? tag.split(":").pop() : tag;
      return (label ?? "")
        .replaceAll("-", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .filter(Boolean)
    .slice(0, max);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { barcode } = await params;
  const product = await getProduct(barcode);

  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false },
    };
  }

  const name = product.product_name?.trim() || `Product ${barcode}`;
  const brand = product.brands?.split(",")[0]?.trim();
  const categories = categoryLabels(product.categories_tags, 2).join(", ");
  const description = [brand, categories].filter(Boolean).join(" — ") ||
    `Nutrition and ingredients for ${name}.`;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      type: "article",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

function buildJsonLd(product: OFFProduct) {
  const brand = product.brands?.split(",")[0]?.trim();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.product_name?.trim() || `Product ${product.code}`,
    image: product.image_url ? [product.image_url] : undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    gtin13: product.code,
    category: categoryLabels(product.categories_tags, 1)[0],
  };
}

export default async function ProductPage({ params }: Props) {
  const { barcode } = await params;
  const product = await getProduct(barcode);
  if (!product) notFound();

  const name = product.product_name?.trim() || `Product ${barcode}`;
  const brand = product.brands?.split(",")[0]?.trim();
  const { grade, label: gradeLabel } = nutriScoreLabel(product.nutriscore_grade);
  const labels = categoryLabels(product.categories_tags, 6);

  return (
    <article className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        // schema.org JSON-LD for SEO; safe because the payload is server-built from typed fields
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(product)) }}
      />

      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Back to discover
      </Link>

      <header className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-square w-full max-w-xs flex-shrink-0 overflow-hidden rounded-lg border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={name}
              fill
              priority
              sizes="(min-width: 640px) 320px, 100vw"
              className="object-contain p-3"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          {brand && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{brand}</p>
          )}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-bold ${NUTRISCORE_STYLES[grade]}`}
              aria-label={`Nutri-Score ${gradeLabel}`}
              title={`Nutri-Score ${gradeLabel}`}
            >
              {gradeLabel}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Nutri-Score
            </span>
          </div>
          <p className="font-mono text-xs text-zinc-500">Barcode: {product.code}</p>
        </div>
      </header>

      <section aria-labelledby="nutriments-heading" className="flex flex-col gap-3">
        <h2 id="nutriments-heading" className="text-xl font-semibold">
          Nutrition
        </h2>
        <Nutriments nutriments={product.nutriments} />
      </section>

      <section aria-labelledby="ingredients-heading" className="flex flex-col gap-3">
        <h2 id="ingredients-heading" className="text-xl font-semibold">
          Ingredients
        </h2>
        <IngredientList text={product.ingredients_text} />
      </section>

      {labels.length > 0 && (
        <section aria-labelledby="labels-heading" className="flex flex-col gap-3">
          <h2 id="labels-heading" className="text-xl font-semibold">
            Categories
          </h2>
          <ul className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <li
                key={label}
                className="rounded-full border border-black/15 px-3 py-1 text-xs dark:border-white/15"
              >
                {label}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
