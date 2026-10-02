import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://localhost:5432/marketplace',
  }),
});

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@marketplace.local' },
    update: {},
    create: {
      email: 'admin@marketplace.local',
      passwordHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  const ebooks = await prisma.category.upsert({
    where: { slug: 'ebooks' },
    update: {},
    create: {
      name: 'E-books',
      slug: 'ebooks',
      description: 'Digital books and guides',
    },
  });

  const templates = await prisma.category.upsert({
    where: { slug: 'templates' },
    update: {},
    create: {
      name: 'Templates',
      slug: 'templates',
      description: 'Website and document templates',
    },
  });

  await prisma.product.upsert({
    where: { slug: 'nextjs-ecommerce-guide' },
    update: {},
    create: {
      title: 'Next.js E-commerce Guide',
      slug: 'nextjs-ecommerce-guide',
      description:
        'A practical guide to building e-commerce apps with Next.js.',
      priceCents: 1900,
      status: 'PUBLISHED',
      categoryId: ebooks.id,
      sellerId: admin.id,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'typescript-style-guide' },
    update: {},
    create: {
      title: 'TypeScript Style Guide',
      slug: 'typescript-style-guide',
      description: 'Strict-mode patterns for real-world TypeScript projects.',
      priceCents: 1200,
      status: 'PUBLISHED',
      categoryId: ebooks.id,
      sellerId: admin.id,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'saas-landing-template' },
    update: {},
    create: {
      title: 'SaaS Landing Template',
      slug: 'saas-landing-template',
      description: 'Production-ready landing page template for SaaS products.',
      priceCents: 4900,
      status: 'PUBLISHED',
      categoryId: templates.id,
      sellerId: admin.id,
    },
  });

  console.log('Seed completed: 1 user, 2 categories, 3 products.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
