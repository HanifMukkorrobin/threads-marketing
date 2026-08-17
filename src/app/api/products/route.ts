import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProduct, generateSlug, getUniqueSlug } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category')?.trim();

    const whereClause: any = {};

    if (category && category !== 'All' && category !== 'Semua') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const rawProducts = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const products = rawProducts.map(formatProduct);

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
      data: products,
    });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching products' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      category,
      description,
      variants,
      usp,
      targetAudience,
      toneOfVoice,
      ctaTemplate,
      isActive = true,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json(
        { success: false, error: 'Product category is required' },
        { status: 400 }
      );
    }

    const baseSlug = (slug && typeof slug === 'string' && slug.trim())
      ? generateSlug(slug)
      : generateSlug(name);

    const finalSlug = await getUniqueSlug(baseSlug);

    const variantsStr = typeof variants === 'string'
      ? variants
      : JSON.stringify(Array.isArray(variants) ? variants : []);

    const uspStr = typeof usp === 'string'
      ? usp
      : JSON.stringify(Array.isArray(usp) ? usp : []);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        category: category.trim(),
        description: description ? String(description).trim() : null,
        variants: variantsStr,
        usp: uspStr,
        targetAudience: targetAudience ? String(targetAudience).trim() : null,
        toneOfVoice: toneOfVoice ? String(toneOfVoice).trim() : null,
        ctaTemplate: ctaTemplate ? String(ctaTemplate).trim() : null,
        isActive: Boolean(isActive),
      },
    });

    const formatted = formatProduct(product);

    return NextResponse.json(
      {
        success: true,
        data: formatted,
        product: formatted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating product' },
      { status: 500 }
    );
  }
}
