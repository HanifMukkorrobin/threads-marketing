import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProduct, generateSlug, getUniqueSlug } from '@/lib/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const formatted = formatProduct(product);

    return NextResponse.json({
      success: true,
      data: formatted,
      product: formatted,
    });
  } catch (error) {
    console.error(`Error in GET /api/products/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

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
      isActive,
    } = body;

    let finalSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      finalSlug = await getUniqueSlug(generateSlug(slug), existing.id);
    } else if (name && name !== existing.name && !slug) {
      // If name changed and slug not explicitly provided, update slug
      finalSlug = await getUniqueSlug(generateSlug(name), existing.id);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (finalSlug) updateData.slug = finalSlug;
    if (category !== undefined) updateData.category = String(category).trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (variants !== undefined) {
      updateData.variants = typeof variants === 'string'
        ? variants
        : JSON.stringify(Array.isArray(variants) ? variants : []);
    }
    if (usp !== undefined) {
      updateData.usp = typeof usp === 'string'
        ? usp
        : JSON.stringify(Array.isArray(usp) ? usp : []);
    }
    if (targetAudience !== undefined) {
      updateData.targetAudience = targetAudience ? String(targetAudience).trim() : null;
    }
    if (toneOfVoice !== undefined) {
      updateData.toneOfVoice = toneOfVoice ? String(toneOfVoice).trim() : null;
    }
    if (ctaTemplate !== undefined) {
      updateData.ctaTemplate = ctaTemplate ? String(ctaTemplate).trim() : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    const formatted = formatProduct(updated);

    return NextResponse.json({
      success: true,
      data: formatted,
      product: formatted,
    });
  } catch (error) {
    console.error(`Error in PUT /api/products/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating product' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let nextIsActive = !existing.isActive;
    if (typeof body.isActive === 'boolean') {
      nextIsActive = body.isActive;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isActive: nextIsActive,
      },
    });

    const formatted = formatProduct(updated);

    return NextResponse.json({
      success: true,
      data: formatted,
      product: formatted,
    });
  } catch (error) {
    console.error(`Error in PATCH /api/products/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while toggling product status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      id,
    });
  } catch (error) {
    console.error(`Error in DELETE /api/products/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while deleting product' },
      { status: 500 }
    );
  }
}
