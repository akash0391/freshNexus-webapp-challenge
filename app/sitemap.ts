import type { MetadataRoute } from "next";
import { FEATURED_BARCODES, SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/insights`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const productRoutes: MetadataRoute.Sitemap = FEATURED_BARCODES.map(
    (barcode) => ({
      url: `${SITE_URL}/product/${barcode}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...productRoutes];
}
