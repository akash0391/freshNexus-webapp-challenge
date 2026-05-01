import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Open Food Facts images flow through our /api/img proxy — see app/api/img/route.ts.
    // Next 16 requires explicit allowlisting for same-origin URLs that carry a query string.
    localPatterns: [{
      pathname: "/api/img",
    }],
    remotePatterns: [{
      protocol: "https",
      hostname: "world.openfoodfacts.org",
      pathname: "/images/**",
    }, {
      protocol: "https",
      hostname: "images.openfoodfacts.org",
      pathname: "/**",
    }, {
      protocol: "https",
      hostname: "static.openfoodfacts.org",
      pathname: "/**"
    }]
  }
};

export default nextConfig;
