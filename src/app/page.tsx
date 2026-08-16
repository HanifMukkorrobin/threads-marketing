import React from 'react';
import { Sparkles, MessageSquare, TrendingUp, Layers } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto space-y-8">
      <header className="border-b border-threads-border pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-threads-text flex items-center gap-2">
            <span className="text-threads-accent">@</span> Threads Marketing Engine
          </h1>
          <p className="text-sm text-threads-secondary mt-1">
            Data-backed thread generation, hook analysis, and conversion workflows
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-threads-card border border-threads-border rounded-threads p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-threads-surface text-threads-accent">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm">Thread Builder</h3>
          </div>
          <p className="text-xs text-threads-secondary">
            Multi-post thread construction with live character counters and connected visuals.
          </p>
        </div>

        <div className="bg-threads-card border border-threads-border rounded-threads p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-threads-surface text-threads-success">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm">AI Hook Generator</h3>
          </div>
          <p className="text-xs text-threads-secondary">
            Generate high-CTR opening hooks across 5 proven copywriting archetypes.
          </p>
        </div>

        <div className="bg-threads-card border border-threads-border rounded-threads p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-threads-surface text-threads-warning">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm">Analytics & Funnel</h3>
          </div>
          <p className="text-xs text-threads-secondary">
            Track engagement, reach, and click-through rates across campaigns.
          </p>
        </div>
      </section>
    </main>
  );
}
