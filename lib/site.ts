export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const FEATURED_BARCODES = [
  "3017624010701",
  "737628064502",
  "4008400301020",
  "5000159407236",
  "8076800195057",
] as const;
