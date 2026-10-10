"use server";

import { updateTag } from "next/cache";

/** Expires the Next Data Cache entries for the given storefront tags
 * ("products", "posts", "settings", …). Admin mutations call this after a
 * successful save so the next visitor request is FRESH: updateTag expires
 * immediately (read-your-own-writes), while revalidateTag(tag, "max")
 * would serve one stale page and refresh in the background. A missed call
 * self-heals within the 300 s service TTL. */
export async function revalidateStorefrontTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    updateTag(tag);
  }
}
