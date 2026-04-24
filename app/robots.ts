import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "facebookexternalhit",
          "Facebot",
          "FacebookBot",
          "Meta-ExternalAgent",
          "Meta-ExternalFetcher",
        ],
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://plpainel.com/sitemap.xml",
  };
}
