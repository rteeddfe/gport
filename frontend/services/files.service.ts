import { apiFetch } from "@/lib/api/client";
import type { UploadedFileInfo } from "@/types/api";

/** Admin image upload (logo, og:image, favicons). Returns the public URL
 * to store in settings fields — GET /files/:id serves it immutably. */
export function uploadImage(file: File): Promise<UploadedFileInfo> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<UploadedFileInfo, FormData>("/admin/uploads", {
    method: "POST",
    body,
  });
}
