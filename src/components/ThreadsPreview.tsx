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
    <div className={cn('flex flex-col items-center space-y-4 w-full', className)}>
      {/* Top Header & Switcher */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#C95D53] border-2 border-[#181816] animate-pulse" />
          <span className="text-xs font-black text-[#181816] uppercase tracking-wider">
            Live Threads Simulator
          </span>
          {productName && (
            <span className="hidden sm:inline-flex items-center rounded-retro-xs bg-[#D8C49D] border border-[#181816] px-2 py-0.5 text-[10px] font-black text-[#181816] shadow-[1px_1px_0px_0px_#181816] uppercase">
              {productName}
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-retro-xs bg-white p-1 border-2 border-[#181816] shadow-[2px_2px_0px_0px_#181816]">
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-black transition-all tap-effect uppercase tracking-wider',
              viewMode === 'mobile'
                ? 'bg-[#6B9AC4] text-white shadow-[1px_1px_0px_0px_#181816]'
                : 'text-[#181816] hover:bg-[#FAF6EE]'
            )}
          >
            <Smartphone className="h-3 w-3 stroke-[2.5]" />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-none text-xs font-black transition-all tap-effect uppercase tracking-wider',
              viewMode === 'desktop'
                ? 'bg-[#6B9AC4] text-white shadow-[1px_1px_0px_0px_#181816]'
                : 'text-[#181816] hover:bg-[#FAF6EE]'
            )}
          >
            <Monitor className="h-3 w-3 stroke-[2.5]" />
            <span>Feed</span>
          </button>
        </div>
      </div>

      {/* Simulator Device Frame with 90s Poster Outline */}
      <div
        className={cn(
          'w-full transition-all duration-200',
          viewMode === 'mobile' ? 'max-w-md' : 'max-w-xl'
        )}
      >
        <div className="rounded-retro-sm bg-[#FAF6EE] p-3 sm:p-4 shadow-[8px_8px_0px_0px_#181816] border-[3px] border-[#181816] text-[#181816]">
          {/* Mobile Island Top Notch */}
          {viewMode === 'mobile' && (
            <div className="flex items-center justify-between px-4 pt-0.5 pb-2.5 text-[11px] font-black text-[#7A7468] select-none border-b-2 border-[#181816] mb-3">
              <span>09:41</span>
              <div className="h-3.5 w-16 rounded-full bg-[#181816] flex items-center justify-center border border-[#181816]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6B9AC4]" />
              </div>
              <div className="flex items-center gap-1 font-mono">
                <span>5G</span>
                <span className="h-2.5 w-4 rounded-xs border-2 border-[#181816] p-[1px] inline-block">
                  <span className="h-full w-full bg-[#6B9AC4] block rounded-2xs" />
                </span>
              </div>
            </div>
          )}

          {/* Threads App Container */}
          <div className="rounded-retro-xs bg-white p-4 sm:p-5 space-y-4 min-h-[420px] max-h-[580px] overflow-y-auto custom-scrollbar border-2 border-[#181816] shadow-[3px_3px_0px_0px_#181816]">
            {/* Header in feed */}
            <div className="flex items-center justify-center pb-2 border-b-2 border-[#181816]">
              <span className="text-sm font-black text-[#181816] tracking-tight uppercase">
                Threads
              </span>
            </div>

            {!hasAnyContent ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-2 text-[#7A7468]">
                <div className="h-11 w-11 rounded-retro-xs bg-[#D8C49D] flex items-center justify-center text-[#181816] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-[#4A463F]">Tulis konten di editor untuk melihat live preview di Threads.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activePosts.map((post, idx) => {
                  const isLast = idx === activePosts.length - 1;
                  const isLiked = likedPosts[idx] || false;
                  const currentLikes = likeCounts[idx] || 25;

                  return (
                    <div key={post.id || idx} className="relative flex gap-3 group">
                      {/* Left: Avatar + Connected Line */}
                      <div className="flex flex-col items-center shrink-0">
                        {/* Avatar */}
                        <div className="relative flex h-9 w-9 items-center justify-center rounded-retro-xs bg-[#6B9AC4] border-2 border-[#181816] shadow-[1.5px_1.5px_0px_0px_#181816] text-white">
                          <span className="text-xs font-black uppercase">
                            {accountName.charAt(0) || '@'}
                          </span>
                        </div>

                        {/* Connected Vertical Thread Line */}
                        {!isLast && (
                          <div className="w-[2px] flex-1 bg-[#181816]/30 group-hover:bg-[#6B9AC4] transition-colors my-1.5 min-h-[36px]" />
                        )}
                      </div>

                      {/* Right: Content & Actions */}
                      <div className="flex-1 pb-4 space-y-2">
                        {/* Author Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-[#181816] hover:underline cursor-pointer">
                              @{accountHandle.replace(/^@/, '')}
                            </span>
                            <span className="text-[11px] text-[#7A7468]">•</span>
                            <span className="text-[11px] text-[#7A7468] font-mono">1m</span>
                          </div>
                          <button type="button" className="text-[#7A7468] hover:text-[#181816]">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Post Text */}
                        <div className="text-xs sm:text-[13px] text-[#181816] leading-relaxed whitespace-pre-wrap font-sans font-medium selection:bg-[#6B9AC4] selection:text-white">
                          {post.content || <span className="text-[#7A7468] italic font-normal">Bagian post ini masih kosong...</span>}
                        </div>

                        {/* Media Attachment if provided */}
                        {post.mediaUrl && (
                          <div className="rounded-retro-xs overflow-hidden border-2 border-[#181816] bg-[#FAF6EE] my-2 shadow-[2px_2px_0px_0px_#181816]">
                            <img
                              src={post.mediaUrl}
                              alt="Post media"
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

                        {/* Interactive Micro-Action Bar */}
                        <div className="flex items-center gap-4 pt-1 text-[#7A7468]">
                          {/* Heart / Like button */}
                          <button
                            type="button"
                            onClick={() => toggleLike(idx)}
                            className={cn(
                              'flex items-center gap-1 text-xs transition-transform tap-effect group/like',
                              isLiked ? 'text-[#C95D53] font-black scale-105' : 'hover:text-[#181816]'
                            )}
                          >
                            <Heart
                              className={cn(
                                'h-4 w-4 transition-all duration-200',
                                isLiked ? 'fill-[#C95D53] text-[#C95D53] animate-pop' : 'group-hover/like:scale-110'
                              )}
                            />
                            <span>{currentLikes}</span>
                          </button>

                          {/* Reply */}
                          <button type="button" className="flex items-center gap-1 text-xs hover:text-[#181816] transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            <span>8</span>
                          </button>

                          {/* Repost */}
                          <button type="button" className="flex items-center gap-1 text-xs hover:text-[#181816] transition-colors">
                            <Repeat2 className="h-4 w-4" />
                            <span>5</span>
                          </button>

                          {/* Share */}
                          <button type="button" className="text-xs hover:text-[#181816] transition-colors ml-auto">
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
