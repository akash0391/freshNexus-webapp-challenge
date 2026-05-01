import { type NextRequest, NextResponse } from "next/server";

// Proxies Open Food Facts images through our own origin so:
//   1. Browsers don't get rate-limited (429) by OFF when a grid loads ~24 images at once.
//   2. Next's image optimizer can fetch from a same-origin URL, sidestepping the "resolved to
//      private ip" rejection that NAT64 networks trigger when resolving OFF hostnames.
//   3. Vercel's edge can cache a single canonical response per OFF URL.
const ALLOWED_HOSTS = new Set([
  "world.openfoodfacts.org",
  "images.openfoodfacts.org",
  "static.openfoodfacts.org",
]);

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("u");
  if (!target) return new NextResponse("Missing u", { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return new NextResponse("Forbidden host", { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "FreshNexus/0.1 (image proxy)" },
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) {
      return new NextResponse(null, { status: upstream.status || 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        // OFF image URLs are content-addressed (`.{rev}.{size}.jpg`) so safe to cache hard.
        "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
