"use server";

import { revalidateTag } from "next/cache";

/** Drops the Next Data Cache entries for the given storefront tags
 * ("products", "posts", "settings", …). Admin mutations call this after a
 * successful save so the server-rendered public pages pick the change up
 * immediately; a missed call self-heals within the 300 s service TTL. */
export async function revalidateStorefrontTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    // "max" = the documented SWR profile: visitors get the cached page
    // while the fresh one renders in the background.
    revalidateTag(tag, "max");
  }
}
