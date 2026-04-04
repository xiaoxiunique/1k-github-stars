import type { MetadataRoute } from "next";
import { getAllLangSlugs, getExportedAt } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = getExportedAt();
  const corePages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/daily-trading`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/awesome`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const languagePages = getAllLangSlugs().map((lang) => ({
    url: `${SITE_URL}/${lang}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...corePages, ...languagePages];
}
