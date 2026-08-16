import { Product } from './product';

export type DraftStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED';

export type DraftType = 'SINGLE' | 'THREAD_CHAIN';

export type DraftSource = 'HERMES_AI' | 'MANUAL';

export interface DraftPostItem {
  id: string;
  draftId: string;
  orderIndex: number;
  content: string;
  mediaUrl: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ContentDraft {
  id: string;
  productId: string | null;
  product?: Product | null;
  title: string;
  type: DraftType | string;
  status: DraftStatus | string;
  hookAngle: string | null;
  scheduledAt: string | Date | null;
  publishedAt: string | Date | null;
  threadPostId: string | null;
  threadPostUrl: string | null;
  errorMessage: string | null;
  source: DraftSource | string;
  metadata: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  posts: DraftPostItem[];
}

export interface CreateDraftPostInput {
  orderIndex?: number;
  content: string;
  mediaUrl?: string | null;
}

export interface CreateDraftInput {
  title: string;
  productId?: string | null;
  type?: DraftType;
  status?: DraftStatus;
  hookAngle?: string | null;
  source?: DraftSource;
  scheduledAt?: string | Date | null;
  metadata?: string | Record<string, any> | null;
  posts: CreateDraftPostInput[];
}

export interface UpdateDraftInput {
  title?: string;
  productId?: string | null;
  type?: DraftType;
  status?: DraftStatus;
  hookAngle?: string | null;
  scheduledAt?: string | Date | null;
  publishedAt?: string | Date | null;
  threadPostId?: string | null;
  threadPostUrl?: string | null;
  errorMessage?: string | null;
  source?: DraftSource;
  metadata?: string | Record<string, any> | null;
  posts?: CreateDraftPostInput[];
}

export interface DraftFilterParams {
  status?: DraftStatus | 'ALL';
  productId?: string;
  search?: string;
}
