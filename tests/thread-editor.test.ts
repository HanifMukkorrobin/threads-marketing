import { describe, it, expect } from 'vitest';
import {
  MAX_THREAD_CHAR_COUNT,
  SAFE_CHAR_THRESHOLD,
  getCharCountStatus,
  addThreadPart,
  removeThreadPart,
  moveThreadPartUp,
  moveThreadPartDown,
  updateThreadPartContent,
  updateThreadPartMedia,
  validateThreadDraft,
  prepareDraftPayload,
  ThreadPartState,
} from '../src/lib/thread-editor';

describe('Thread Editor Logic & Character Limits (`src/lib/thread-editor`)', () => {
  describe('Character Count Limits & Indicators', () => {
    it('has a 500 character limit constant and 400 safe threshold', () => {
      expect(MAX_THREAD_CHAR_COUNT).toBe(500);
      expect(SAFE_CHAR_THRESHOLD).toBe(400);
    });

    it('returns "green" status when character count is less than 400', () => {
      const status0 = getCharCountStatus('');
      expect(status0.status).toBe('green');
      expect(status0.count).toBe(0);
      expect(status0.remaining).toBe(500);
      expect(status0.isValid).toBe(true);
      expect(status0.progressPercentage).toBe(0);

      const status250 = getCharCountStatus('A'.repeat(250));
      expect(status250.status).toBe('green');
      expect(status250.count).toBe(250);
      expect(status250.remaining).toBe(250);
      expect(status250.isValid).toBe(true);
      expect(status250.progressPercentage).toBe(50);

      const status399 = getCharCountStatus('A'.repeat(399));
      expect(status399.status).toBe('green');
      expect(status399.count).toBe(399);
      expect(status399.remaining).toBe(101);
      expect(status399.isValid).toBe(true);
    });

    it('returns "amber" status when character count is between 400 and 500 inclusive', () => {
      const status400 = getCharCountStatus('A'.repeat(400));
      expect(status400.status).toBe('amber');
      expect(status400.count).toBe(400);
      expect(status400.remaining).toBe(100);
      expect(status400.isValid).toBe(true);
      expect(status400.progressPercentage).toBe(80);

      const status475 = getCharCountStatus('A'.repeat(475));
      expect(status475.status).toBe('amber');
      expect(status475.count).toBe(475);
      expect(status475.remaining).toBe(25);
      expect(status475.isValid).toBe(true);

      const status500 = getCharCountStatus('A'.repeat(500));
      expect(status500.status).toBe('amber');
      expect(status500.count).toBe(500);
      expect(status500.remaining).toBe(0);
      expect(status500.isValid).toBe(true);
      expect(status500.progressPercentage).toBe(100);
    });

    it('returns "red" status and isValid=false when character count exceeds 500', () => {
      const status501 = getCharCountStatus('A'.repeat(501));
      expect(status501.status).toBe('red');
      expect(status501.count).toBe(501);
      expect(status501.remaining).toBe(-1);
      expect(status501.isValid).toBe(false);
      expect(status501.progressPercentage).toBe(100);

      const status650 = getCharCountStatus('A'.repeat(650));
      expect(status650.status).toBe('red');
      expect(status650.count).toBe(650);
      expect(status650.remaining).toBe(-150);
      expect(status650.isValid).toBe(false);
      expect(status650.progressPercentage).toBe(100);
    });
  });

  describe('Thread Part Ordering & Manipulation', () => {
    const initialPosts: ThreadPartState[] = [
      { id: 'p-1', orderIndex: 0, content: 'Post #1: Hook intro', mediaUrl: null },
      { id: 'p-2', orderIndex: 1, content: 'Post #2: Feature breakdown', mediaUrl: 'https://example.com/img1.jpg' },
      { id: 'p-3', orderIndex: 2, content: 'Post #3: Call to action', mediaUrl: null },
    ];

    it('adds a new thread part with next consecutive orderIndex', () => {
      const updated = addThreadPart(initialPosts, 'Post #4: FAQ');
      expect(updated).toHaveLength(4);
      expect(updated[3].orderIndex).toBe(3);
      expect(updated[3].content).toBe('Post #4: FAQ');
      expect(updated[3].mediaUrl).toBeNull();
      expect(updated[3].id).toBeDefined();
    });

    it('removes a thread part and reindexes remaining parts sequentially', () => {
      const updated = removeThreadPart(initialPosts, 1); // remove Post #2
      expect(updated).toHaveLength(2);
      expect(updated[0].id).toBe('p-1');
      expect(updated[0].orderIndex).toBe(0);
      expect(updated[1].id).toBe('p-3');
      expect(updated[1].orderIndex).toBe(1);
      expect(updated[1].content).toBe('Post #3: Call to action');
    });

    it('does not remove if only 1 post remains (keeps at least 1 post)', () => {
      const singlePost: ThreadPartState[] = [
        { id: 'p-1', orderIndex: 0, content: 'Only post', mediaUrl: null },
      ];
      const updated = removeThreadPart(singlePost, 0);
      expect(updated).toHaveLength(1);
      expect(updated[0].content).toBe('Only post');
    });

    it('moves a thread part up and adjusts orderIndex', () => {
      const moved = moveThreadPartUp(initialPosts, 1); // move Post #2 up to index 0
      expect(moved).toHaveLength(3);
      expect(moved[0].id).toBe('p-2');
      expect(moved[0].orderIndex).toBe(0);
      expect(moved[1].id).toBe('p-1');
      expect(moved[1].orderIndex).toBe(1);
      expect(moved[2].id).toBe('p-3');
      expect(moved[2].orderIndex).toBe(2);
    });

    it('does not change array when trying to move the first part up (boundary)', () => {
      const moved = moveThreadPartUp(initialPosts, 0);
      expect(moved).toEqual(initialPosts);
    });

    it('moves a thread part down and adjusts orderIndex', () => {
      const moved = moveThreadPartDown(initialPosts, 1); // move Post #2 down to index 2
      expect(moved).toHaveLength(3);
      expect(moved[0].id).toBe('p-1');
      expect(moved[0].orderIndex).toBe(0);
      expect(moved[1].id).toBe('p-3');
      expect(moved[1].orderIndex).toBe(1);
      expect(moved[2].id).toBe('p-2');
      expect(moved[2].orderIndex).toBe(2);
    });

    it('does not change array when trying to move the last part down (boundary)', () => {
      const moved = moveThreadPartDown(initialPosts, 2);
      expect(moved).toEqual(initialPosts);
    });

    it('updates content of a specific thread part', () => {
      const updated = updateThreadPartContent(initialPosts, 1, 'Updated Post #2 content');
      expect(updated[1].content).toBe('Updated Post #2 content');
      expect(updated[0].content).toBe(initialPosts[0].content);
      expect(updated[2].content).toBe(initialPosts[2].content);
    });

    it('updates media URL of a specific thread part', () => {
      const updated = updateThreadPartMedia(initialPosts, 0, 'https://example.com/new-image.png');
      expect(updated[0].mediaUrl).toBe('https://example.com/new-image.png');

      const cleared = updateThreadPartMedia(updated, 0, '');
      expect(cleared[0].mediaUrl).toBeNull();
    });
  });

  describe('Thread Validation and Payload Preparation', () => {
    it('validates valid thread parts successfully', () => {
      const validPosts: ThreadPartState[] = [
        { id: '1', orderIndex: 0, content: 'Part 1 intro', mediaUrl: null },
        { id: '2', orderIndex: 1, content: 'Part 2 body', mediaUrl: null },
      ];

      const result = validateThreadDraft(validPosts, 'My Draft Title');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation when draft title is empty', () => {
      const posts: ThreadPartState[] = [
        { id: '1', orderIndex: 0, content: 'Valid post content', mediaUrl: null },
      ];

      const result = validateThreadDraft(posts, '   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Judul draft tidak boleh kosong');
    });

    it('fails validation when any post exceeds 500 characters', () => {
      const posts: ThreadPartState[] = [
        { id: '1', orderIndex: 0, content: 'Short post', mediaUrl: null },
        { id: '2', orderIndex: 1, content: 'X'.repeat(505), mediaUrl: null },
      ];

      const result = validateThreadDraft(posts, 'Valid Title');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((err) => err.includes('Post #2 melebihi batas 500 karakter'))).toBe(true);
    });

    it('fails validation when all thread posts are completely empty', () => {
      const posts: ThreadPartState[] = [
        { id: '1', orderIndex: 0, content: '   ', mediaUrl: null },
        { id: '2', orderIndex: 1, content: '', mediaUrl: null },
      ];

      const result = validateThreadDraft(posts, 'Valid Title');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimal harus ada 1 post dengan isi konten');
    });

    it('prepares clean payload for PUT /api/drafts/[id]', () => {
      const posts: ThreadPartState[] = [
        { id: 'p-1', orderIndex: 0, content: '  First post content  ', mediaUrl: 'https://img.com/1.png' },
        { id: 'p-2', orderIndex: 1, content: 'Second post content', mediaUrl: '  ' },
      ];

      const payload = prepareDraftPayload({
        title: '  Thread Peluncuran Canva Pro  ',
        hookAngle: 'Problem Agitation',
        productId: 'prod-123',
        posts,
      });

      expect(payload).toEqual({
        title: 'Thread Peluncuran Canva Pro',
        hookAngle: 'Problem Agitation',
        productId: 'prod-123',
        type: 'THREAD_CHAIN',
        posts: [
          { orderIndex: 0, content: 'First post content', mediaUrl: 'https://img.com/1.png' },
          { orderIndex: 1, content: 'Second post content', mediaUrl: null },
        ],
      });
    });

    it('sets type to SINGLE if only 1 post is present', () => {
      const posts: ThreadPartState[] = [
        { id: 'p-1', orderIndex: 0, content: 'Single announcement', mediaUrl: null },
      ];

      const payload = prepareDraftPayload({
        title: 'Single Post Title',
        hookAngle: null,
        productId: null,
        posts,
      });

      expect(payload.type).toBe('SINGLE');
      expect(payload.posts).toHaveLength(1);
    });
  });
});
