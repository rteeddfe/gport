import type { MetadataRoute } from "next";

import { getPolicies } from "@/services/policies.service";
import { getPosts } from "@/services/posts.service";
import { getProducts } from "@/services/products.service";

/** Revalidated hourly and on every admin catalog/blog mutation (the
 * service reads go through the same fetch-cache tags the admin hooks
 * revalidate), so a new product/post lands here without a redeploy. */
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Auto-generated sitemap: every public content route — home, catalog
 * sections, product/top-up pages, blog posts, policies and the reviews
 * page. Auth and dashboard routes are deliberately excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1, changeFrequency: "daily" },
    { url: `${SITE_URL}/products`, priority: 0.9, changeFrequency: "daily" },
    { url: `${SITE_URL}/topup`, priority: 0.9, changeFrequency: "daily" },
    { url: `${SITE_URL}/blog`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${SITE_URL}/reviews`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${SITE_URL}/promotions`, priority: 0.6, changeFrequency: "weekly" },
  ];

  // Catalog can outgrow one page — walk the pagination (the API caps a
  // page at 100; 10 pages is plenty for years of a store this size).
  const productEntries: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await getProducts({ page, limit: 100 }).catch(() => null);
    if (!result || result.items.length === 0) break;
    for (const product of result.items) {
      // Keys live on /products/<slug>, top-ups on /topup/<slug> — the
      // same split the pages themselves use.
      const path = product.kind === "GAME_KEY" ? "products" : "topup";
      productEntries.push({
        url: `${SITE_URL}/${path}/${product.slug}`,
        lastModified: product.updatedAt,
        priority: 0.8,
        changeFrequency: "weekly",
      });
    }
    if (page >= result.pages) break;
  }

  const posts = await getPosts({ limit: 100 }).catch(() => null);
  const postEntries: MetadataRoute.Sitemap = (posts?.items ?? []).map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    priority: 0.7,
    changeFrequency: "weekly",
  }));

  const policies = await getPolicies().catch(() => null);
  const policyEntries: MetadataRoute.Sitemap = (policies ?? []).map((policy) => ({
    url: `${SITE_URL}/policies/${policy.slug}`,
    lastModified: policy.updatedAt,
    priority: 0.3,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...productEntries, ...postEntries, ...policyEntries];
}
