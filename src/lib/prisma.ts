import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

function loadLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}

if (!process.env.DATABASE_URL) {
  loadLocalEnv();
}

function normalizeDatabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('file:.')) {
    const relPath = url.replace(/^file:/, '');
    const directPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(directPath)) {
      const inPrismaDir = path.resolve(process.cwd(), 'prisma', relPath);
      if (fs.existsSync(inPrismaDir)) {
        return `file:${inPrismaDir}`;
      }
    }
    return `file:${directPath}`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const resolvedUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    resolvedUrl
      ? {
          datasources: {
            db: {
              url: resolvedUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
