"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "cn";

/** Product page gallery: main cover + thumbnail strip when there are
 * several images. Store-logo fallback on a neon wash for products
 * without covers. */
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const cover = images[active];

  return (
    <div className="space-y-3">
      <div className="bg-surface border-border relative aspect-[3/4] overflow-hidden rounded-2xl border">
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            priority
            sizes="(max-width: 424px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-[radial-gradient(20rem_16rem_at_50%_20%,rgb(139_92_246/0.25),transparent_70%),radial-gradient(16rem_14rem_at_80%_90%,rgb(85_221_229/0.15),transparent_70%)]"
          >
            <Image
              src="/logo2.png"
              alt=""
              width={2400}
              height={1569}
              className="relative h-20 w-auto opacity-90"
            />
          </div>
        )}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              aria-label={`Обложка ${index + 1}`}
              aria-current={index === active}
              onClick={() => setActive(index)}
              className={cn(
                "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg border transition-opacity",
                index === active
                  ? "border-brand glow-brand"
                  : "border-border opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
