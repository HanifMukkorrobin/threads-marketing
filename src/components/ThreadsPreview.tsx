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
    0: 42,
    1: 28,
    2: 19,
  });

  const toggleLike = (index: number) => {
    setLikedPosts((prev) => {
      const isCurrentlyLiked = !prev[index];
      setLikeCounts((counts) => ({
        ...counts,
        [index]: (counts[index] || 20) + (isCurrentlyLiked ? 1 : -1),
      }));
      return { ...prev, [index]: isCurrentlyLiked };
    });
  };

  const activePosts = posts.length > 0 ? posts : [{ id: 'demo', orderIndex: 0, content: '', mediaUrl: null }];
  const hasAnyContent = posts.some((p) => p.content && p.content.trim().length > 0);

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Top Header & Switcher */}
      <div className="w-full flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-lime border border-black animate-pulse" />
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Threads Live Simulator
          </span>
          {productName && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-surface border border-surface-border px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              {productName}
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-full bg-surface p-1 border border-surface-border">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all tap-effect',
              viewMode === 'mobile'
                ? 'bg-ink text-white shadow-pill'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Smartphone className="h-3 w-3" />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all tap-effect',
              viewMode === 'desktop'
                ? 'bg-ink text-white shadow-pill'
                : 'text-ink-secondary hover:text-ink'
            )}
          >
            <Monitor className="h-3 w-3" />
            <span>Web Feed</span>
          </button>
        </div>
      </div>

      {/* Simulator Device Frame */}
      <div
        className={cn(
          'w-full transition-all duration-300',
          viewMode === 'mobile' ? 'max-w-md' : 'max-w-xl'
        )}
      >
        <div className="rounded-[36px] bg-[#121214] p-3 sm:p-4 shadow-dock border border-black text-white">
          {/* Mobile Island Top Notch */}
          {viewMode === 'mobile' && (
            <div className="flex items-center justify-between px-6 pt-1 pb-3 text-[11px] font-bold text-zinc-400 select-none">
              <span>09:41</span>
              <div className="h-4 w-20 rounded-full bg-black/80 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span className="h-2.5 w-4 rounded-xs border border-zinc-400 p-[1px] inline-block">
                  <span className="h-full w-full bg-zinc-300 block rounded-2xs" />
                </span>
              </div>
            </div>
          )}

          {/* Threads App Container */}
          <div className="rounded-[28px] bg-black p-4 sm:p-5 space-y-4 min-h-[440px] max-h-[640px] overflow-y-auto custom-scrollbar">
            {/* Header / Brand in feed */}
            <div className="flex items-center justify-center pb-2 border-b border-zinc-800/80">
              <span className="text-sm font-extrabold text-white tracking-tight">
                Threads
              </span>
            </div>

            {!hasAnyContent ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-2 text-zinc-500">
                <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium">Tulis konten di editor sebelah untuk melihat live preview di Threads.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activePosts.map((post, idx) => {
                  const isLast = idx === activePosts.length - 1;
                  const isLiked = likedPosts[idx] || false;
                  const currentLikes = likeCounts[idx] || 25;

                  return (
                    <div key={post.id || idx} className="relative flex gap-3.5 group">
                      {/* Left: Avatar + Connected Line */}
                      <div className="flex flex-col items-center shrink-0">
                        {/* Avatar */}
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-lime to-emerald-400 p-[1.5px]">
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-[#18181A] text-[11px] font-bold text-white uppercase">
                            {accountName.charAt(0) || '@'}
                          </div>
                        </div>

                        {/* Connected Vertical Thread Line */}
                        {!isLast && (
                          <div className="w-[2px] flex-1 bg-zinc-800 group-hover:bg-zinc-600 transition-colors my-1.5 min-h-[40px]" />
                        )}
                      </div>

                      {/* Right: Content & Actions */}
                      <div className="flex-1 pb-5 space-y-2">
                        {/* Author Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white hover:underline cursor-pointer">
                              {accountHandle}
                            </span>
                            <span className="text-[11px] text-zinc-500">•</span>
                            <span className="text-[11px] text-zinc-500">1m</span>
                          </div>
                          <button type="button" className="text-zinc-500 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Post Text */}
                        <div className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-lime selection:text-ink">
                          {post.content || <span className="text-zinc-600 italic">Bagian post ini masih kosong...</span>}
                        </div>

                        {/* Media Attachment if provided */}
                        {post.mediaUrl && (
                          <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/80 my-2">
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full h-44 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Interactive Micro-Action Bar */}
                        <div className="flex items-center gap-4 pt-1 text-zinc-400">
                          {/* Heart / Like button with spring bounce animation */}
                          <button
                            type="button"
                            onClick={() => toggleLike(idx)}
                            className={cn(
                              'flex items-center gap-1 text-xs transition-transform tap-effect group/like',
                              isLiked ? 'text-rose-500 font-bold scale-105' : 'hover:text-white'
                            )}
                          >
                            <Heart
                              className={cn(
                                'h-4 w-4 transition-all duration-200',
                                isLiked ? 'fill-rose-500 text-rose-500 animate-pop' : 'group-hover/like:scale-110'
                              )}
                            />
                            <span>{currentLikes}</span>
                          </button>

                          {/* Reply */}
                          <button type="button" className="flex items-center gap-1 text-xs hover:text-white transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            <span>8</span>
                          </button>

                          {/* Repost */}
                          <button type="button" className="flex items-center gap-1 text-xs hover:text-white transition-colors">
                            <Repeat2 className="h-4 w-4" />
                            <span>5</span>
                          </button>

                          {/* Share */}
                          <button type="button" className="text-xs hover:text-white transition-colors ml-auto">
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
