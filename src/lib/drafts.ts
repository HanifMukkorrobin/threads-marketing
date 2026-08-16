import { formatProduct } from './products';
import { ContentDraft, DraftStatus, DraftType, DraftSource } from '@/types/draft';

export const VALID_DRAFT_STATUSES: DraftStatus[] = [
  'PENDING_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED',
];

export function isValidDraftStatus(status: any): status is DraftStatus {
  return typeof status === 'string' && VALID_DRAFT_STATUSES.includes(status as DraftStatus);
}

export function formatDraft(d: any): ContentDraft {
  const posts = Array.isArray(d.posts)
    ? [...d.posts].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    : [];

  return {
    id: d.id,
    productId: d.productId ?? null,
    product: d.product ? formatProduct(d.product) : null,
    title: d.title,
    type: (d.type as DraftType) || (posts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE'),
    status: (d.status as DraftStatus) || 'PENDING_REVIEW',
    hookAngle: d.hookAngle ?? null,
    scheduledAt: d.scheduledAt ?? null,
    publishedAt: d.publishedAt ?? null,
    threadPostId: d.threadPostId ?? null,
    threadPostUrl: d.threadPostUrl ?? null,
    errorMessage: d.errorMessage ?? null,
    source: (d.source as DraftSource) || 'MANUAL',
    metadata: d.metadata ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    posts: posts.map((p: any, idx: number) => ({
      id: p.id || `post-${idx}`,
      draftId: p.draftId || d.id,
      orderIndex: typeof p.orderIndex === 'number' ? p.orderIndex : idx,
      content: p.content || '',
      mediaUrl: p.mediaUrl || null,
      createdAt: p.createdAt || d.createdAt,
      updatedAt: p.updatedAt || d.updatedAt,
    })),
  };
}

export const DRAFT_STATUS_CONFIG: Record<
  DraftStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  PENDING_REVIEW: {
    label: 'Menunggu Review',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'Draft siap untuk ditinjau dan diedit sebelum diposting',
  },
  APPROVED: {
    label: 'Siap Diposting',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'Draft telah disetujui dan siap diposting ke Threads',
  },
  SCHEDULED: {
    label: 'Dijadwalkan',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    description: 'Dijadwalkan untuk dipublikasikan pada waktu tertentu',
  },
  PUBLISHED: {
    label: 'Terpublikasi',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    description: 'Konten berhasil dipublikasikan di platform Threads',
  },
  FAILED: {
    label: 'Gagal Diposting',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    description: 'Terjadi kegagalan saat proses penerbitan',
  },
};
