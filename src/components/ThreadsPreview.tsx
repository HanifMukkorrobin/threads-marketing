'use client';

import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  MoreHorizontal,
  Smartphone,
  Monitor,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ThreadPartState } from '@/lib/thread-editor';
import { cn } from '@/lib/utils';

interface ThreadsPreviewProps {
  posts: ThreadPartState[];
  accountName?: string;
  accountHandle?: string;
  avatarUrl?: string | null;
  productName?: string | null;
  className?: string;
}

export function ThreadsPreview({
  posts,
  accountName = 'Toko Digital ID',
  accountHandle = 'tokodigital.id',
  avatarUrl,
  productName,
  className,
}: ThreadsPreviewProps) {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({
    0: 24,
    1: 18,
    2: 12,
    3: 9,
    4: 6,
  });

  const toggleLike = (index: number) => {
    setLikedPosts((prev) => {
      const isCurrentlyLiked = !!prev[index];
      const nextLiked = !isCurrentlyLiked;
      setLikeCounts((counts) => ({
        ...counts,
        [index]: (counts[index] || 10) + (nextLiked ? 1 : -1),
      }));
      return { ...prev, [index]: nextLiked };
    });
  };

  // Filter out empty posts or show fallback placeholder if no content
  const activePosts = posts.length > 0 ? posts : [{ id: 'demo', orderIndex: 0, content: '', mediaUrl: null }];
  const hasAnyContent = posts.some((p) => p.content && p.content.trim().length > 0);

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Top Controls: View mode switcher & Preview banner */}
      <div className="w-full flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-threads-text flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Threads Simulator
          </span>
          {productName && (
            <span className="hidden sm:inline-flex items-center rounded-md bg-threads-surface px-2 py-0.5 text-[10px] text-threads-secondary border border-threads-border">
              {productName}
            </span>
          )}
        </div>

        {/* Mobile / Desktop Switcher */}
        <div className="flex items-center rounded-xl bg-threads-card p-1 border border-threads-border shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              viewMode === 'mobile'
                ? 'bg-threads-surface text-threads-text font-semibold shadow-xs border border-threads-border'
                : 'text-threads-secondary hover:text-threads-text'
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              viewMode === 'desktop'
                ? 'bg-threads-surface text-threads-text font-semibold shadow-xs border border-threads-border'
                : 'text-threads-secondary hover:text-threads-text'
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Web Feed</span>
          </button>
        </div>
      </div>

      {/* Simulator Container */}
      <div
        className={cn(
          'transition-all duration-300 w-full flex justify-center',
          viewMode === 'mobile' ? 'max-w-[400px]' : 'max-w-[580px]'
        )}
      >
        <div
          className={cn(
            'w-full bg-[#101010] text-[#F3F5F7] shadow-2xl transition-all',
            viewMode === 'mobile'
              ? 'rounded-[36px] border-[6px] border-[#222222] p-4 pt-3 pb-8 shadow-black/80 ring-1 ring-white/10'
              : 'rounded-2xl border border-threads-border p-5'
          )}
        >
          {/* Mobile Status Bar Mockup */}
          {viewMode === 'mobile' && (
            <div className="flex items-center justify-between px-3 pb-3 mb-2 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400">
              <span>9:41</span>
              {/* Dynamic Island / Speaker Pill */}
              <div className="h-4 w-24 rounded-full bg-black border border-zinc-800" />
              <div className="flex items-center gap-1 text-[10px]">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Threads App Top Header */}
          <div className="flex items-center justify-between pb-4 pt-1 px-1 border-b border-[#202020] mb-4">
            {/* Threads glyph logo */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-sm text-white">
                @
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-tight leading-none">
                  Threads
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {activePosts.length} Post Chain
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-white">
                Follow
              </span>
              <button
                type="button"
                className="text-zinc-500 hover:text-zinc-300 p-1"
                aria-label="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Empty Placeholder Notice if completely blank */}
          {!hasAnyContent && (
            <div className="my-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-2">
              <Sparkles className="h-6 w-6 text-zinc-500 mx-auto" />
              <p className="text-xs font-medium text-zinc-400">
                Simulator Real-Time Threads
              </p>
              <p className="text-[11px] text-zinc-600 max-w-xs mx-auto">
                Ketik konten di panel editor sebelah kiri untuk melihat simulasi visual postingan secara langsung.
              </p>
            </div>
          )}

          {/* Connected Thread Post Chain */}
          <div className="space-y-0">
            {activePosts.map((post, idx) => {
              const isLast = idx === activePosts.length - 1;
              const isLiked = !!likedPosts[idx];
              const likes = likeCounts[idx] || (24 - idx * 5);
              const replies = Math.max(1, 14 - idx * 3);
              const reposts = Math.max(0, 8 - idx * 2);

              return (
                <div key={post.id || idx} className="relative flex items-start gap-3 group">
                  {/* Left Column: Avatar & Vertical Connected Line */}
                  <div className="relative flex flex-col items-center self-stretch">
                    {/* Store Avatar */}
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-700 text-white font-bold text-xs shadow-sm overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={accountName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{accountName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Continuous Vertical Line between posts */}
                    {!isLast && (
                      <div className="w-[2px] grow bg-zinc-800 my-1 group-hover:bg-zinc-700 transition-colors" />
                    )}
                  </div>

                  {/* Right Column: Post Body, Content, Media, and Action Bar */}
                  <div className="flex-1 pb-5 pt-0.5 space-y-2 min-w-0">
                    {/* User Header */}
                    <div className="flex items-center justify-between gap-1 leading-tight">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="font-semibold text-xs text-white truncate">
                          {accountHandle}
                        </span>
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-sky-400" />
                      </div>

                      <div className="flex items-center gap-2 text-zinc-500 text-[11px] shrink-0">
                        <span>{idx === 0 ? '2m' : `${idx * 2}m`}</span>
                        <button
                          type="button"
                          className="text-zinc-600 hover:text-zinc-400"
                          aria-label="Post Options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap break-words font-sans selection:bg-sky-500/30">
                      {post.content ? (
                        post.content
                      ) : (
                        <span className="italic text-zinc-600 text-[11px]">
                          {idx === 0
                            ? 'Menunggu input hook / teks utama...'
                            : `Menunggu input lanjutan post #${idx + 1}...`}
                        </span>
                      )}
                    </div>

                    {/* Media Image Attachment if present */}
                    {post.mediaUrl && (
                      <div className="mt-2.5 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                        <img
                          src={post.mediaUrl}
                          alt={`Attachment for post #${idx + 1}`}
                          className="max-h-64 w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Realistic Action Buttons Bar */}
                    <div className="flex items-center gap-4 pt-1 text-zinc-400">
                      {/* Heart / Like */}
                      <button
                        type="button"
                        onClick={() => toggleLike(idx)}
                        className={cn(
                          'flex items-center gap-1 text-[11px] transition-colors',
                          isLiked ? 'text-rose-500' : 'hover:text-white'
                        )}
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4 transition-transform active:scale-125',
                            isLiked && 'fill-rose-500 stroke-rose-500'
                          )}
                        />
                        <span>{likes}</span>
                      </button>

                      {/* Reply */}
                      <div className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer">
                        <MessageCircle className="h-4 w-4" />
                        <span>{replies}</span>
                      </div>

                      {/* Repost */}
                      <div className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer">
                        <Repeat2 className="h-4 w-4" />
                        <span>{reposts}</span>
                      </div>

                      {/* Share / Send */}
                      <div className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer">
                        <Send className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
