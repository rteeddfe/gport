"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { uploadImage } from "@/services/files.service";

interface ProductImagesFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

/** Multi-cover field for the admin product form: each upload lands in the
 * DB and appends its public /files/:id URL (the storefront proxies it).
 * Plain <img> previews on purpose — uploads may be SVG. */
export function ProductImagesField({ value, onChange }: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadImage(file);
        next.push(uploaded.url);
      }
      onChange(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="bg-canvas border-border relative size-20 shrink-0 overflow-hidden rounded-lg border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Обложка ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Убрать обложку ${index + 1}`}
              className="bg-canvas/80 text-foreground absolute right-1 top-1 grid size-5 place-items-center rounded-full border"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ))}
        <label className="border-border text-muted-foreground hover:border-brand/60 hover:text-brand flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs transition-colors">
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          {isUploading ? "Загрузка…" : "Загрузить"}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </label>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Первая картинка — обложка в каталоге (вертикальный постер, 3:4).
      </p>
      {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
    </div>
  );
}
