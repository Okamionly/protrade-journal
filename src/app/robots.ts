import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/about", "/pricing", "/blog", "/contact", "/login", "/register"],
        disallow: ["/api/", "/dashboard/", "/journal/", "/analytics/", "/calendar/", "/chat/", "/market/", "/screenshots/", "/import/", "/admin/", "/settings/", "/profile/", "/trades/"],
      },
    ],
    sitemap: "https://marketphase.vercel.app/sitemap.xml",
  };
}
