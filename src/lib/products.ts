import { prisma } from '@/lib/prisma';

export function formatProduct(p: any) {
  let parsedVariants = [];
  let parsedUsp = [];

  try {
    parsedVariants = typeof p.variants === 'string' ? JSON.parse(p.variants || '[]') : (p.variants || []);
  } catch {
    parsedVariants = [];
  }

  try {
    parsedUsp = typeof p.usp === 'string' ? JSON.parse(p.usp || '[]') : (p.usp || []);
  } catch {
    parsedUsp = [];
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    description: p.description,
    variants: Array.isArray(parsedVariants) ? parsedVariants : [],
    usp: Array.isArray(parsedUsp) ? parsedUsp : [],
    targetAudience: p.targetAudience,
    toneOfVoice: p.toneOfVoice,
    ctaTemplate: p.ctaTemplate,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

export async function getUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}
