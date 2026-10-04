"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { uploadImage } from "@/services/files.service";

interface PostCoverFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

/** Single-cover field for the admin post form: the upload lands in the DB
 * and stores its public /files/:id URL (the storefront proxies it). Plain
 * <img> preview on purpose — uploads may be SVG. */
export function PostCoverField({ value, onChange }: PostCoverFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadImage(file);
      onChange(uploaded.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка загрузки");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          <div className="bg-canvas border-border relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Обложка новости" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Убрать обложку"
              className="bg-canvas/80 text-foreground absolute right-1 top-1 grid size-5 place-items-center rounded-full border"
              onClick={() => onChange(null)}
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ) : (
          <label className="border-border text-muted-foreground hover:border-brand/60 hover:text-brand flex h-24 w-40 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs transition-colors">
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
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
        )}
        <p className="text-muted-foreground max-w-56 text-xs leading-relaxed">
          Горизонтальная обложка (16:9). Без обложки карточка покажет
          неоновую заглушку с первой буквой заголовка.
        </p>
      </div>
      {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
    </div>
  );
}
