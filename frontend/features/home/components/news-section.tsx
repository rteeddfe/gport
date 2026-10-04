"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PostCard } from "@/features/blog/components/post-card";
import type { Post } from "@/types/api";

import { riseItem, staggerContainer } from "./motion-presets";
import { SectionHeading } from "./section-heading";

/** Latest store news: the homepage server component feeds the newest
 * published posts (limit 3) from the blog API; cards reuse the blog
 * PostCard (logo fallback cover included). Empty list → nothing renders. */
export function NewsSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section id="news" className="scroll-mt-24 pb-16">
      <Container>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div
            variants={riseItem}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <SectionHeading
              kicker="Новости"
              title={
                <>
                  Что нового <span className="text-gradient">в магазине</span>
                </>
              }
            />
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground group flex items-center gap-1.5 pb-1 text-sm font-medium transition-colors"
            >
              Все новости
              <ArrowRight className="size-4 transition-all group-hover:translate-x-0.5 group-hover:text-neon" />
            </Link>
          </motion.div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <motion.div key={post.id} variants={riseItem} className="h-full">
                <PostCard post={post} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
