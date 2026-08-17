import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatProduct } from '@/lib/products';
import { reviseDraftContent } from '@/lib/revision-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Draft ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { instruction, targetPartIndex, autoSave = false } = body;

    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      return NextResponse.json(
        { success: false, error: 'Instruksi revisi wajib diisi' },
        { status: 400 }
      );
    }

    const existing = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        product: true,
        posts: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Draft tidak ditemukan' }, { status: 404 });
    }

    const formattedProduct = existing.product ? formatProduct(existing.product) : null;

    const configs = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }
    const store = {
      name: configMap['STORE_NAME'] || 'Toko Digital ID',
      username: configMap['STORE_USERNAME'] || 'tokodigital.id',
    };

    const revisionResult = await reviseDraftContent({
      posts: existing.posts.map((p) => ({
        orderIndex: p.orderIndex,
        content: p.content,
        mediaUrl: p.mediaUrl,
      })),
      product: formattedProduct,
      store,
      instruction: instruction.trim(),
      targetPartIndex: typeof targetPartIndex === 'number' ? targetPartIndex : null,
    });

    // If autoSave is requested, persist directly to database
    if (autoSave) {
      await prisma.$transaction(async (tx) => {
        await tx.draftPostItem.deleteMany({
          where: { draftId: id },
        });

        await tx.draftPostItem.createMany({
          data: revisionResult.posts.map((p, idx) => ({
            draftId: id,
            orderIndex: idx,
            content: p.content,
            mediaUrl: p.mediaUrl || null,
          })),
        });

        let parsedMetadata: any = {};
        try {
          parsedMetadata = existing.metadata ? JSON.parse(existing.metadata) : {};
        } catch {
          parsedMetadata = {};
        }

        const revisions = Array.isArray(parsedMetadata.revisions) ? parsedMetadata.revisions : [];
        revisions.push({
          instruction: instruction.trim(),
          timestamp: new Date().toISOString(),
          explanation: revisionResult.explanation,
        });
        parsedMetadata.revisions = revisions;

        await tx.contentDraft.update({
          where: { id },
          data: {
            metadata: JSON.stringify(parsedMetadata),
            status: 'PENDING_REVIEW',
          },
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        posts: revisionResult.posts,
        explanation: revisionResult.explanation,
        revisedPartIndex: revisionResult.revisedPartIndex,
      },
      message: revisionResult.explanation,
    });
  } catch (error: any) {
    console.error(`Error in POST /api/drafts/${params.id}/revise:`, error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses revisi AI' },
      { status: 500 }
    );
  }
}
