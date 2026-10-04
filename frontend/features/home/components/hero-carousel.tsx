"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * Hero banner art: a draggable circular 3D carousel. Rotation lives in a
 * framer motion value: `useAnimationFrame` spins it slowly, pointer
 * drag adds to the same value (auto-spin pauses while dragging), and
 * every card's face counter-rotates by `-(angle + slot)` so cards always
 * face the viewer — no mirrored backs. Depth comes from the scene
 * perspective (see `.carousel-*` in globals.css).
 *
 * PLACEHOLDER content: covers are borrowed from the home «Игровые
 * валюты» block (`public/games/*.jpg`, DEVELOPMENT-ONLY placeholder art)
 * purely as a fallback until the carousel's real content is decided —
 * titles and prices are still dummy. Swap for real data then.
 */
const COVERS = [
  "/games/pubg-mobile.jpg",
  "/games/genshin-impact.jpg",
  "/games/roblox.jpg",
  "/games/valorant.jpg",
  "/games/delta-force.jpg",
  "/games/minecraft-minecoins.jpg",
  "/games/arena-breakout.jpg",
  "/games/blood-strike.jpg",
];

const SLOT_COUNT = COVERS.length;
/** deg per ms — a full turn in ~30 s. */
const SPIN_SPEED = 0.012;
/** px of pointer travel per degree of rotation. */
const DRAG_FACTOR = 0.35;

function CarouselCard({
  cover,
  slot,
  angle,
}: {
  cover: string;
  slot: number;
  angle: MotionValue<number>;
}) {
  const faceAngle = useTransform(angle, (v) => -(v + slot));

  return (
    <div
      className="carousel-card"
      style={{ "--card-angle": `${slot}deg` } as CSSProperties}
    >
      <motion.div className="carousel-card-face" style={{ rotateY: faceAngle }}>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)]">
          <div className="relative h-[180px] bg-canvas">
            <Image src={cover} alt="" fill sizes="140px" className="object-cover" />
          </div>
          <div className="space-y-0.5 p-2.5">
            <p className="truncate text-xs font-medium">Название товара</p>
            <p className="text-xs font-semibold text-neon">от 999 ₽</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroCarousel() {
  const angle = useMotionValue(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useAnimationFrame((_, delta) => {
    if (!reduceMotion && !draggingRef.current) {
      angle.set(angle.get() + delta * SPIN_SPEED);
    }
  });

  return (
    <div
      aria-hidden
      className="carousel-scene relative size-[440px] -translate-y-14 translate-x-12 cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={(event) => {
        draggingRef.current = true;
        lastXRef.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) {
          return;
        }
        angle.set(angle.get() + (event.clientX - lastXRef.current) * DRAG_FACTOR);
        lastXRef.current = event.clientX;
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    >
      <motion.div className="carousel-ring" style={{ rotateX: -14, rotateY: angle }}>
        {COVERS.map((cover, i) => (
          <CarouselCard
            key={cover}
            cover={cover}
            slot={(i * 360) / SLOT_COUNT}
            angle={angle}
          />
        ))}
      </motion.div>
    </div>
  );
}
