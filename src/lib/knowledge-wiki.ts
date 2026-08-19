/**
 * Obsidian Knowledge Vault Engine
 * Ingests rich research notes and educational frameworks from Markdown files (KNOWLEDGE_VAULT_PATH)
 */

import fs from 'fs';
import path from 'path';

export interface KnowledgeTopic {
  id: string;
  title: string;
  category: string;
  tags: string[];
  targetAudience?: string;
  summary?: string;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  sourceUrl?: string;
  content: string;
  filePath?: string;
}

/**
 * Lightweight, zero-dependency YAML Frontmatter and Markdown Body Parser
 */
export function parseMarkdownFrontmatter(rawContent: string, defaultId?: string): KnowledgeTopic {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);

  if (!match) {
    // No frontmatter, treat entire file as body
    const firstHeading = rawContent.match(/^#\s+(.+)$/m);
    const title = firstHeading ? firstHeading[1].trim() : (defaultId || 'Untitled Topic');
    return {
      id: defaultId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      category: 'General Education',
      tags: [],
      content: rawContent.trim(),
    };
  }

  const yamlBlock = match[1];
  const bodyContent = match[2].trim();

  const metadata: Record<string, any> = {};
  const lines = yamlBlock.split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse array format e.g. ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        metadata[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        metadata[key] = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
    } else {
      metadata[key] = value;
    }
  }

  const firstHeading = bodyContent.match(/^#\s+(.+)$/m);
  const inferredTitle = String(metadata.title || (firstHeading ? firstHeading[1].trim() : (defaultId || 'Untitled Topic')));
  const id = metadata.id || defaultId || inferredTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Infer category if not explicitly set
  let inferredCategory = metadata.category;
  if (!inferredCategory) {
    if (metadata.type === 'entity') inferredCategory = 'Product Intelligence';
    else if (metadata.type === 'concept') inferredCategory = 'Content & Hooks';
    else inferredCategory = 'Digital Tech';
  }

  // Infer summary if not explicitly set
  let inferredSummary = metadata.summary;
  if (!inferredSummary && bodyContent) {
    const cleanBody = bodyContent.replace(/^#[^\n]+\n/g, '').trim();
    const firstParagraph = cleanBody.split(/\n\s*\n/)[0];
    if (firstParagraph && firstParagraph.length > 10) {
      inferredSummary = firstParagraph.replace(/^[#\-*\s]+/, '').slice(0, 200).trim();
    }
  }

  return {
    id: String(id),
    title: inferredTitle,
    category: String(inferredCategory),
    tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
    targetAudience: metadata.targetAudience ? String(metadata.targetAudience) : undefined,
    summary: inferredSummary ? String(inferredSummary) : undefined,
    priority: metadata.priority || 'NORMAL',
    sourceUrl: metadata.sourceUrl ? String(metadata.sourceUrl) : undefined,
    content: bodyContent,
  };
}

/**
 * Resolves directory path to the Obsidian Knowledge Vault
 */
export function getKnowledgeVaultDirectory(customDir?: string): string {
  if (customDir) return path.resolve(customDir);
  if (process.env.KNOWLEDGE_VAULT_PATH) {
    return path.resolve(process.env.KNOWLEDGE_VAULT_PATH);
  }
  return path.resolve(process.cwd(), 'knowledge');
}

/**
 * Recursively scans and loads all Markdown files in the Knowledge Vault
 */
export async function loadAllKnowledgeTopics(customDir?: string): Promise<KnowledgeTopic[]> {
  const vaultDir = getKnowledgeVaultDirectory(customDir);
  if (!fs.existsSync(vaultDir)) {
    return [];
  }

  const topics: KnowledgeTopic[] = [];

  function scanDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      // Ignore hidden directories like .git or .obsidian
      if (entry.name.startsWith('.')) continue;

      const lowerName = entry.name.toLowerCase();

      // Ignore non-content directories (raw sources, schema configs, internal sources)
      if (['raw', 'schema', 'sources'].includes(lowerName)) continue;

      // Ignore root and meta files
      if (['schema.md', 'index.md', 'log.md', 'config.md', 'readme.md'].includes(lowerName)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const defaultId = path.basename(entry.name, '.md');
          const topic = parseMarkdownFrontmatter(raw, defaultId);
          topic.filePath = fullPath;
          topics.push(topic);
        } catch (err) {
          console.warn(`[Knowledge Vault] Failed to parse ${fullPath}:`, err);
        }
      }
    }
  }

  try {
    scanDir(vaultDir);
  } catch (err) {
    console.warn(`[Knowledge Vault] Scan error:`, err);
  }

  return topics;
}

/**
 * Retrieves a single knowledge topic by ID
 */
export async function getKnowledgeTopicById(id: string, customDir?: string): Promise<KnowledgeTopic | null> {
  const all = await loadAllKnowledgeTopics(customDir);
  return all.find((t) => t.id === id || t.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Selects the least-recently used knowledge topic to prevent repetitive organic posts
 */
export function selectLRUKnowledgeTopic(
  topics: KnowledgeTopic[],
  recentDrafts: Array<{ id: string; metadata?: string | null; createdAt: Date }>
): KnowledgeTopic | null {
  if (!topics || topics.length === 0) return null;

  const lastUsedMap = new Map<string, number>();

  for (const draft of recentDrafts) {
    if (draft.metadata) {
      try {
        const meta = typeof draft.metadata === 'string' ? JSON.parse(draft.metadata) : draft.metadata;
        const topicId = meta.sourceTopicId || meta.knowledgeTopicId;
        if (topicId) {
          const time = new Date(draft.createdAt).getTime();
          const existing = lastUsedMap.get(topicId);
          if (!existing || time > existing) {
            lastUsedMap.set(topicId, time);
          }
        }
      } catch {
        // ignore JSON parse error
      }
    }
  }

  let oldestTime = Infinity;
  let candidate: KnowledgeTopic = topics[0];

  for (const topic of topics) {
    const lastTime = lastUsedMap.get(topic.id);
    if (lastTime === undefined) {
      // Never used before, maximum priority
      return topic;
    }
    if (lastTime < oldestTime) {
      oldestTime = lastTime;
      candidate = topic;
    }
  }

  return candidate;
}
