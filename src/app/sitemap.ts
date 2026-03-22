import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog-posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://marketphase.vercel.app";
  const now = new Date();

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/journal-de-trading`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/journal-de-trading-gratuit`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/marketphase-vs-tradezella`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/marketphase-vs-tradervue`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...blogEntries,
    { url: `${baseUrl}/extension`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
