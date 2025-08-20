import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Use env if set, else your known IDs:
const PROJECTS_DB_ID =
  process.env.PROJECTS_DB_ID ||
  '223333490a11817390abe4872289edaf'; // Projects

// Simple 30s in-process cache (per serverless instance)
const CACHE = new Map<string, { at: number; data: any }>();
const TTL = 30_000;
const getCache = (k: string) => {
  const v = CACHE.get(k);
  if (!v) return null;
  if (Date.now() - v.at > TTL) { CACHE.delete(k); return null; }
  return v.data;
};
const setCache = (k: string, data: any) => { CACHE.set(k, { at: Date.now(), data }); };

// Resolve relation page titles with a tiny cache
const titleCache = new Map<string, string>();
async function getPageTitle(pageId: string): Promise<string> {
  if (titleCache.has(pageId)) return titleCache.get(pageId)!;
  const page = await notion.pages.retrieve({ page_id: pageId as any }) as any;
  const props = page.properties || {};
  // try common title keys
  const titleProp = Object.values(props).find((p: any) => p?.type === 'title') as any;
  const title =
    titleProp?.title?.map((t: any) => t.plain_text).join('') ||
    page?.url?.split('/').pop() ||
    'Untitled';
  titleCache.set(pageId, title);
  return title;
}

function getPlainText(prop: any): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'title') return prop.title?.map((t: any) => t?.plain_text).join('') || undefined;
  if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t?.plain_text).join('') || undefined;
  if (prop.type === 'select') return prop.select?.name;
  if (prop.type === 'status') return prop.status?.name;
  if (prop.type === 'number') return String(prop.number);
  return undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') || 'All';
    const cacheKey = JSON.stringify({ q, status });

    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build filter: push as much as we safely can to Notion
    // We know Projects has title "Project" and a text "Location". Client may be relation, so we filter it client-side.
    const and: any[] = [];
    if (status && status !== 'All') {
      and.push({ property: 'Status', select: { equals: status } });
    }
    if (q) {
      and.push({
        or: [
          { property: 'Project', title: { contains: q } },
          { property: 'Location', rich_text: { contains: q } },
          // (client filtered later; relation cannot be text-searched server-side)
        ],
      });
    }

    const items: any[] = [];
    let cursor: string | undefined;
    do {
      const page = await notion.databases.query({
        database_id: PROJECTS_DB_ID,
        page_size: 100,
        ...(and.length ? { filter: { and } } : {}),
        ...(cursor ? { start_cursor: cursor } : {}),
      } as any);
      items.push(...page.results);
      cursor = (page as any).next_cursor || undefined;
    } while (cursor);

    // Map fields + resolve client relation titles
    // We’ll extract title, status, location. Client could be relation or text.
    const mapped = await Promise.all(items.map(async (pg: any) => {
      const props = pg.properties || {};
      const title = getPlainText(props['Project']) || 'Untitled';
      const statusName = getPlainText(props['Status']);
      const location = getPlainText(props['Location']);

      let client: string | undefined;
      const clientProp = props['Client'];
      if (clientProp?.type === 'relation' && Array.isArray(clientProp.relation) && clientProp.relation.length) {
        // first related page’s title (common pattern)
        client = await getPageTitle(clientProp.relation[0].id);
      } else {
        client = getPlainText(clientProp);
      }

      return {
        id: pg.id,
        title,
        status: statusName,
        client,
        location,
      };
    }));

    // Client-side filter by client when q provided (covers relation case)
    const filtered = q
      ? mapped.filter(m =>
          [m.title, m.client, m.location].some(v => (v || '').toLowerCase().includes(q.toLowerCase()))
        )
      : mapped;

    // Build status options from what we actually have
    const statusOptions = Array.from(new Set(mapped.map(m => m.status).filter(Boolean))) as string[];

    const out = { items: filtered, statusOptions };
    setCache(cacheKey, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
