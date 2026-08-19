import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  parseMarkdownFrontmatter,
  loadAllKnowledgeTopics,
  getKnowledgeTopicById,
  selectLRUKnowledgeTopic,
  KnowledgeTopic,
} from '../src/lib/knowledge-wiki';

describe('Obsidian Markdown Knowledge Vault Engine', () => {
  const testKnowledgeDir = path.resolve(__dirname, './fixtures/knowledge');

  beforeEach(() => {
    if (!fs.existsSync(testKnowledgeDir)) {
      fs.mkdirSync(testKnowledgeDir, { recursive: true });
    }
  });

  it('parses valid YAML frontmatter and markdown body correctly', () => {
    const rawMarkdown = `---
id: "test-topic-1"
title: "Formula 4 Langkah Prompting AI"
category: "AI & Tech"
tags: ["ai", "prompting", "productivity"]
targetAudience: "Mahasiswa & Freelancer"
summary: "Cara membuat prompt AI yang menghasilkan output presisi."
---

# Ringkasan Materi:
- Poin 1: Role
- Poin 2: Context
- Poin 3: Constraint
- Poin 4: Example
`;

    const parsed = parseMarkdownFrontmatter(rawMarkdown);
    expect(parsed.id).toBe('test-topic-1');
    expect(parsed.title).toBe('Formula 4 Langkah Prompting AI');
    expect(parsed.category).toBe('AI & Tech');
    expect(parsed.tags).toEqual(['ai', 'prompting', 'productivity']);
    expect(parsed.targetAudience).toBe('Mahasiswa & Freelancer');
    expect(parsed.summary).toBe('Cara membuat prompt AI yang menghasilkan output presisi.');
    expect(parsed.content).toContain('Poin 1: Role');
  });

  it('loads all markdown files recursively from knowledge directory', async () => {
    const topic1Path = path.join(testKnowledgeDir, 'topic1.md');
    fs.writeFileSync(
      topic1Path,
      `---
id: "topic-1"
title: "Trik Shortcut Mac"
category: "Productivity"
---
Konten shortcut Mac...`
    );

    const topics = await loadAllKnowledgeTopics(testKnowledgeDir);
    expect(topics.length).toBeGreaterThanOrEqual(1);
    expect(topics.some((t) => t.id === 'topic-1')).toBe(true);

    // Clean up
    if (fs.existsSync(topic1Path)) fs.unlinkSync(topic1Path);
  });

  it('strictly ignores raw/, schema/, sources/ directories and config/log/index/readme meta files', async () => {
    const rawDir = path.join(testKnowledgeDir, 'raw', 'articles');
    fs.mkdirSync(rawDir, { recursive: true });
    const rawArticle = path.join(rawDir, 'long-article.md');
    fs.writeFileSync(rawArticle, '# Long Raw Article');

    const schemaDir = path.join(testKnowledgeDir, 'wiki', 'schema');
    fs.mkdirSync(schemaDir, { recursive: true });
    const configPath = path.join(schemaDir, 'config.md');
    fs.writeFileSync(configPath, '# Schema Config');

    const sourcesDir = path.join(testKnowledgeDir, 'wiki', 'sources');
    fs.mkdirSync(sourcesDir, { recursive: true });
    const sourceSummaryPath = path.join(sourcesDir, 'raw-article-summary.md');
    fs.writeFileSync(sourceSummaryPath, '# Source Summary');

    const schemaPath = path.join(testKnowledgeDir, 'SCHEMA.md');
    fs.writeFileSync(schemaPath, '# Schema Definition');

    const indexPath = path.join(testKnowledgeDir, 'index.md');
    fs.writeFileSync(indexPath, '# Index Catalog');

    const logPath = path.join(testKnowledgeDir, 'log.md');
    fs.writeFileSync(logPath, '# Log Actions');

    const conceptDir = path.join(testKnowledgeDir, 'wiki', 'concepts');
    fs.mkdirSync(conceptDir, { recursive: true });
    const conceptPath = path.join(conceptDir, 'doubt-driven.md');
    fs.writeFileSync(
      conceptPath,
      `---
id: "doubt-driven"
title: "Doubt-Driven Dev"
category: "Content & Hooks"
---
Concept content`
    );

    const topics = await loadAllKnowledgeTopics(testKnowledgeDir);
    const ids = topics.map((t) => t.id);

    expect(ids).toContain('doubt-driven');
    expect(ids).not.toContain('long-article');
    expect(ids).not.toContain('config');
    expect(ids).not.toContain('raw-article-summary');
    expect(ids).not.toContain('schema');
    expect(ids).not.toContain('index');
    expect(ids).not.toContain('log');

    // Clean up
    fs.rmSync(path.join(testKnowledgeDir, 'raw'), { recursive: true, force: true });
    fs.rmSync(path.join(testKnowledgeDir, 'wiki'), { recursive: true, force: true });
    if (fs.existsSync(schemaPath)) fs.unlinkSync(schemaPath);
    if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
  });

  it('infers title, category, and summary when not explicitly specified in frontmatter', () => {
    const rawMarkdown = `---
type: concept
tags: ["frameworks"]
---

# Doubt-Driven Development

Doubt-Driven Development adalah pola review AI di mana kita mendispatch agen baru dengan bias skeptis.

## Detail
Langkah 1...`;

    const parsed = parseMarkdownFrontmatter(rawMarkdown, 'fallback-id');
    expect(parsed.title).toBe('Doubt-Driven Development');
    expect(parsed.category).toBe('Content & Hooks');
    expect(parsed.summary).toContain('Doubt-Driven Development adalah pola review AI');
  });

  it('selects the least-recently used (LRU) knowledge topic based on draft history', () => {
    const topics: KnowledgeTopic[] = [
      { id: 't1', title: 'Topik 1', category: 'AI', content: '', tags: [] },
      { id: 't2', title: 'Topik 2', category: 'Productivity', content: '', tags: [] },
      { id: 't3', title: 'Topik 3', category: 'Security', content: '', tags: [] },
    ];

    const recentDrafts = [
      { id: 'd1', metadata: JSON.stringify({ sourceTopicId: 't1' }), createdAt: new Date('2026-08-18T10:00:00Z') },
      { id: 'd2', metadata: JSON.stringify({ sourceTopicId: 't2' }), createdAt: new Date('2026-08-17T10:00:00Z') },
      // t3 has never been drafted
    ];

    const chosen = selectLRUKnowledgeTopic(topics, recentDrafts);
    expect(chosen?.id).toBe('t3');
  });
});
