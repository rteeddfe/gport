"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { uploadImage } from "@/services/files.service";

interface ImageUploadProps {
  label: string;
  /** Current value — an app path (/logo2.png) or an uploaded /files/:id URL. */
  value?: string | null;
  onChange: (url: string) => void;
  hint?: string;
}

/** Admin image field: upload → the file lands in the DB and the field keeps
 * its public /files/:id URL. Plain <img> preview on purpose: ICO uploads
 * are not worth the optimizer config, and SVG is banned at the API. */
export function ImageUpload({ label, value, onChange, hint }: ImageUploadProps) {
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
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="bg-canvas border-border grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-muted-foreground text-[10px]">нет</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/x-icon"
            className="w-full text-xs"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {hint ? (
            <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
          ) : null}
          {value ? (
            <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
              {value}
            </p>
          ) : null}
          {isUploading ? (
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Загружаем…
            </p>
          ) : null}
          {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
        </div>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground shrink-0"
            onClick={() => onChange("")}
          >
            Убрать
          </Button>
        ) : null}
      </div>
    </div>
  );
}
