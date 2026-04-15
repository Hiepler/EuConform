import type { MetadataRoute } from "next";
import { siteConfig } from "./lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = siteConfig.url;

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          en: `${base}/`,
          de: `${base}/de`,
          "x-default": `${base}/`,
        },
      },
    },
    {
      url: `${base}/de`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: {
          en: `${base}/`,
          de: `${base}/de`,
          "x-default": `${base}/`,
        },
      },
    },
    {
      url: `${base}/spec`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/bias-check`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/legal-notice`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: {
        languages: {
          en: `${base}/legal-notice`,
          de: `${base}/de/impressum`,
        },
      },
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: {
        languages: {
          en: `${base}/privacy`,
          de: `${base}/de/datenschutz`,
        },
      },
    },
    {
      url: `${base}/de/impressum`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: {
        languages: {
          en: `${base}/legal-notice`,
          de: `${base}/de/impressum`,
        },
      },
    },
    {
      url: `${base}/de/datenschutz`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: {
        languages: {
          en: `${base}/privacy`,
          de: `${base}/de/datenschutz`,
        },
      },
    },
  ];
}
