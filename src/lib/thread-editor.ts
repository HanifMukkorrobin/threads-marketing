import { CreateDraftPostInput } from '@/types/draft';

export const MAX_THREAD_CHAR_COUNT = 500;
export const SAFE_CHAR_THRESHOLD = 400;

export interface ThreadPartState {
  id: string;
  orderIndex: number;
  content: string;
  mediaUrl: string | null;
}

export type CharCountStatus = 'green' | 'amber' | 'red';

export interface CharCountResult {
  count: number;
  remaining: number;
  status: CharCountStatus;
  isValid: boolean;
  progressPercentage: number;
}

export function getCharCountStatus(content: string): CharCountResult {
  const count = (content || '').length;
  const remaining = MAX_THREAD_CHAR_COUNT - count;
  const isValid = count <= MAX_THREAD_CHAR_COUNT;
  const progressPercentage = Math.min(100, Math.max(0, (count / MAX_THREAD_CHAR_COUNT) * 100));

  let status: CharCountStatus = 'green';
  if (count > MAX_THREAD_CHAR_COUNT) {
    status = 'red';
  } else if (count >= SAFE_CHAR_THRESHOLD) {
    status = 'amber';
  } else {
    status = 'green';
  }

  return {
    count,
    remaining,
    status,
    isValid,
    progressPercentage,
  };
}

export function generatePartId(): string {
  return 'part-' + Math.random().toString(36).substring(2, 9);
}

export function addThreadPart(
  posts: ThreadPartState[],
  initialContent: string = '',
  mediaUrl: string | null = null
): ThreadPartState[] {
  const newPart: ThreadPartState = {
    id: generatePartId(),
    orderIndex: posts.length,
    content: initialContent,
    mediaUrl,
  };
  return [...posts, newPart];
}

export function removeThreadPart(
  posts: ThreadPartState[],
  indexToRemove: number
): ThreadPartState[] {
  if (posts.length <= 1) {
    return posts;
  }
  const filtered = posts.filter((_, idx) => idx !== indexToRemove);
  return filtered.map((post, idx) => ({
    ...post,
    orderIndex: idx,
  }));
}

export function moveThreadPartUp(
  posts: ThreadPartState[],
  index: number
): ThreadPartState[] {
  if (index <= 0 || index >= posts.length) {
    return posts;
  }
  const updated = [...posts];
  const item = updated[index];
  updated[index] = updated[index - 1];
  updated[index - 1] = item;

  return updated.map((post, idx) => ({
    ...post,
    orderIndex: idx,
  }));
}

export function moveThreadPartDown(
  posts: ThreadPartState[],
  index: number
): ThreadPartState[] {
  if (index < 0 || index >= posts.length - 1) {
    return posts;
  }
  const updated = [...posts];
  const item = updated[index];
  updated[index] = updated[index + 1];
  updated[index + 1] = item;

  return updated.map((post, idx) => ({
    ...post,
    orderIndex: idx,
  }));
}

export function updateThreadPartContent(
  posts: ThreadPartState[],
  index: number,
  content: string
): ThreadPartState[] {
  return posts.map((post, idx) => {
    if (idx === index) {
      return { ...post, content };
    }
    return post;
  });
}

export function updateThreadPartMedia(
  posts: ThreadPartState[],
  index: number,
  mediaUrl: string | null
): ThreadPartState[] {
  const cleanUrl = mediaUrl && mediaUrl.trim() ? mediaUrl.trim() : null;
  return posts.map((post, idx) => {
    if (idx === index) {
      return { ...post, mediaUrl: cleanUrl };
    }
    return post;
  });
}

export function validateThreadDraft(
  posts: ThreadPartState[],
  title: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!title || !title.trim()) {
    errors.push('Judul draft tidak boleh kosong');
  }

  const hasAnyContent = posts.some((p) => p.content && p.content.trim().length > 0);
  if (!hasAnyContent) {
    errors.push('Minimal harus ada 1 post dengan isi konten');
  }

  posts.forEach((post, idx) => {
    const { isValid } = getCharCountStatus(post.content);
    if (!isValid) {
      errors.push(`Post #${idx + 1} melebihi batas 500 karakter (${post.content.length}/500)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface PrepareDraftPayloadInput {
  title: string;
  hookAngle?: string | null;
  productId?: string | null;
  posts: ThreadPartState[];
}

export interface PreparedDraftPayload {
  title: string;
  hookAngle: string | null;
  productId: string | null;
  type: 'SINGLE' | 'THREAD_CHAIN';
  posts: CreateDraftPostInput[];
}

export function prepareDraftPayload({
  title,
  hookAngle,
  productId,
  posts,
}: PrepareDraftPayloadInput): PreparedDraftPayload {
  const cleanTitle = (title || '').trim();
  const cleanHookAngle = hookAngle && hookAngle.trim() ? hookAngle.trim() : null;
  const cleanProductId = productId && productId.trim() ? productId.trim() : null;

  const formattedPosts: CreateDraftPostInput[] = posts.map((p, idx) => ({
    orderIndex: idx,
    content: (p.content || '').trim(),
    mediaUrl: p.mediaUrl && p.mediaUrl.trim() ? p.mediaUrl.trim() : null,
  }));

  return {
    title: cleanTitle,
    hookAngle: cleanHookAngle,
    productId: cleanProductId,
    type: formattedPosts.length > 1 ? 'THREAD_CHAIN' : 'SINGLE',
    posts: formattedPosts,
  };
}
