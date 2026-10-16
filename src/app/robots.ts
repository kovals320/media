import type { MetadataRoute } from "next";

// Shared by link only: keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
