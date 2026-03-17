import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/journal/", "/analytics/", "/calendar/", "/chat/", "/market/", "/screenshots/", "/import/", "/admin/"],
      },
    ],
    sitemap: "https://protrade-journal.vercel.app/sitemap.xml",
  };
}
