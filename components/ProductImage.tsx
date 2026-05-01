"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

// Some Open Food Facts entries advertise an image URL that 404s on the CDN (synthetic test
// barcodes, deleted photos). Without this client-side fallback, those tiles render as a
// broken-image icon. Swapping to the existing "No image" placeholder on the first error keeps
// the grid visually consistent without filtering products out at the API layer.
export function ProductImage({ src, alt, sizes, priority, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
        No image
      </div>
    );
  }

  // Route OFF images through our `/api/img` proxy: same-origin to Next's optimizer (no NAT64
  // private-ip rejection), edge-cached, and immune to OFF's per-IP 429s when many tiles load
  // at once. Non-OFF URLs (e.g. anything we ever pass through here later) load as-is.
  const proxied = /^https:\/\/(?:world|images|static)\.openfoodfacts\.org\//.test(src)
    ? `/api/img?u=${encodeURIComponent(src)}`
    : src;

  return (
    <Image
      src={proxied}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default ProductImage;
