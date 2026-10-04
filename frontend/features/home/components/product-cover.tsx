"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Product cover art on a 3/4 canvas: always paints the neon-wash backdrop
 * with the store logo, and overlays the remote image on top. If the image
 * is missing or fails to load (placeholder hosts are unreachable, broken
 * CDN links), the logo stays visible instead of a broken-image icon or a
 * bare letter.
 */
export function ProductCover({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-canvas">
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center bg-[radial-gradient(16rem_12rem_at_50%_20%,rgb(139_92_246/0.25),transparent_70%),radial-gradient(12rem_10rem_at_80%_90%,rgb(85_221_229/0.15),transparent_70%)]"
      >
        <Image
          src="/logo2.png"
          alt=""
          width={2400}
          height={1569}
          className="relative h-14 w-auto opacity-90"
        />
      </div>
      {showImage ? (
        <Image
          src={src as string}
          alt={title}
          fill
          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
