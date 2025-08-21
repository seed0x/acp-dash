// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

/** -------------------------------
 * Notion client + DB ID helpers
 * ------------------------------- */
export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

const env = (k: string) => process.env[k] || ''

export const PROJECTS_DB_ID = env('PROJECTS_DB_ID')
export const CLIENTS_DB_ID = env('CLIENTS_DB_ID')
export const TIME_DB_ID = env('TIME_DB_ID') // This now doubles as the Photos DB
export const IMPROVEMENTS_DB_ID = env('IMPROVEMENTS_DB_ID')
export const TASKS_DB_ID = env('TASKS_DB_ID')
export const EXPENSES_DB_ID = env('EXPENSES_DB_ID')


/** -------------------------------
 * Flexible schema (Projects)
 * ------------------------------- */
type ProjectKeys = {
  title: string
  status?: string
  client?: string
  clientKind?: 'relation' | 'text'
  location?: string
  builder?: string
  jobAccount?: string
}

const PROJECT_ALIASES: Record<keyof Omit<ProjectKeys, 'clientKind'>, readonly string[]> = {
  title: ['Project', 'Name', 'Title'],
  status: ['Status', 'Status 1', 'Pipeline', 'State'],
  client: ['Client', 'Customer', 'Account', 'Company', 'Contact'],
  location: ['Location', 'Address', 'Job Address', 'Job Address (text)'],
  builder: ['Builder', 'GC', 'General Contractor'],
  jobAccount: ['Job Account Setup', 'Job Account', 'Account Setup'],
}

const projectKeyCache = new Map<string, ProjectKeys>()

// Helper to resolve relation page titles with a tiny cache
const titleCache = new Map<string, string>();
async function getPageTitle(pageId: string): Promise<string> {
  if (titleCache.has(pageId)) return titleCache.get(pageId)!;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const props = page.properties || {};
    const titleProp = Object.values(props).find((p: any) => p?.type === 'title') as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    titleCache.set(pageId, title);
    return title;
  } catch {
    return 'Untitled Relation';
  }
}


async function getProjectKeys(dbId: string): Promise<ProjectKeys> {
  if (projectKeyCache.has(dbId)) return projectKeyCache.get(dbId)!
  const db: any = await notion.databases.retrieve({ database_id: dbId })
  const props: Record<string, any> = db.properties || {}

  const pick = (cands: readonly string[], accept?: (p: any) => boolean) => {
    for (const name of cands) {
      const p = props[name]
      if (p && (!accept || accept(p))) return name
    }
    return undefined
  }

  const title = pick(PROJECT_ALIASES.title, p => p.type === 'title')
  const statusName = pick(PROJECT_ALIASES.status, p => p.type === 'status' || p.type === 'select')
  const clientName = pick(PROJECT_ALIASES.client)
  const location = pick(PROJECT_ALIASES.location)
  const builder = pick(PROJECT_ALIASES.builder)
  const jobAccount = pick(PROJECT_ALIASES.jobAccount, p => p.type === 'checkbox')
  
  const clientKind: 'relation' | 'text' | undefined = 
    clientName && props[clientName]?.type === 'relation' && props[clientName]?.relation?.database_id === CLIENTS_DB_ID ? 'relation' : 'text';

  const keys: ProjectKeys = {
    title: title || Object.keys(props).find(k => props[k]?.type === 'title')!,
    status: statusName,
    client: clientName,
    clientKind,
    location,
    builder,
    jobAccount,
  }

  projectKeyCache.set(dbId, keys)
  return keys
}

/** -------------------------------
 * Property readers
 * ------------------------------- */
function readTitle(p: any, titleKey: string): string {
  const v = p?.[titleKey]?.title
  if (Array.isArray(v) && v.length) return v.map((t: any) => t.plain_text).join(' ')
  return 'Untitled'
}
function readTextish(p: any, key?: string): string | undefined {
  if (!key) return undefined
  const prop = p[key]
  if (!prop) return undefined
  if (prop.type === 'rich_text') return (prop.rich_text || []).map((x: any) => x.plain_text).join(' ')
  if (prop.type === 'title') return (prop.title || []).map((x: any) => x.plain_text).join(' ')
  if (prop.type === 'select') return prop.select?.name
  if (prop.type === 'status') return prop.status?.name
  if (prop.type === 'files') return prop.files?.[0]?.file?.url;
  return undefined
}
function readNumber(p: any, key?: string): number | undefined {
  if (!key) return undefined
  const prop = p[key]
  if (prop?.type === 'number') return prop.number ?? undefined
  return undefined
}

async function queryAll(opts: any): Promise<any[]> {
  const out: any[] = []
  let cursor: string | undefined = undefined
  do {
    const page: any = await notion.databases.query({
      ...opts,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    out.push(...(page.results || []))
    cursor = page.has_more ? page.next_cursor : undefined
  } while (cursor)
  return out
}

/** -------------------------------
 * Public dashboard functions
 * ------------------------------- */

export async function countPostAndBeam(): Promise<number> { /* ... */ return 0 }
export async function listBids(): Promise<any[]> { /* ... */ return [] }

export async function listJobAccountPending(): Promise<Array<{ id: string; title: string; client?: string; }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  if (!keys.jobAccount) {
    console.warn("Warning: No 'Job Account' property found in Projects database.");
    return [];
  }
  
  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    filter: { property: keys.jobAccount, checkbox: { equals: false } },
  })

  return Promise.all(results.map(async (r: any) => {
    const p = r.properties || {}
    let client: string | undefined;
    if (keys.client) {
      if (keys.clientKind === 'relation' && p[keys.client]?.relation?.[0]?.id) {
        client = await getPageTitle(p[keys.client].relation[0].id);
      } else {
        client = readTextish(p, keys.client);
      }
    }
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      client,
    }
  }))
}

export async function listImprovements(openOnly?: boolean): Promise<Array<{ id: string; title: string; status?: string; }>> {
  if (!IMPROVEMENTS_DB_ID) return [];
  const filter = openOnly ? { property: "Status", status: { does_not_equal: "Done" } } : undefined;
  const results = await queryAll({ database_id: IMPROVEMENTS_DB_ID, filter });
  return results.map(r => ({
    id: r.id,
    title: readTitle(r.properties, 'Name'),
    status: readTextish(r.properties, 'Status'),
  }));
}

export async function listProjectOptions(): Promise<Array<{ id: string; title: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const results = await queryAll({ database_id: PROJECTS_DB_ID, page_size: 100 });
  return results.map((r: any) => ({ id: r.id, title: readTitle(r.properties || {}, keys.title) }))
}

export async function listProjectsBoard(input: { q?: string; status?: string }): Promise<{
  items: Array<{ id: string; title: string; status?: string; client?: string; location?: string; builder?: string; }>
  statusOptions: string[]
}> {
  if (!PROJECTS_DB_ID) return { items: [], statusOptions: [] }
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const db: any = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
  const props = db.properties || {}

  const statusOptions = props[keys.status!]?.select?.options.map((o: any) => o.name) || [];

  const andFilters: any[] = []
  if (input.status && input.status !== 'All') {
    andFilters.push({ property: keys.status!, select: { equals: input.status } })
  }
  const q = (input.q || '').trim()
  if (q) {
    const orFilters: any[] = [{ property: keys.title, title: { contains: q } }]
    if (keys.location) orFilters.push({ property: keys.location, rich_text: { contains: q } })
    andFilters.push({ or: orFilters })
  }
  
  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    ...(andFilters.length ? { filter: { and: andFilters } } : {}),
  })

  const items = await Promise.all(results.map(async (r: any) => {
    const p = r.properties || {}
    let client: string | undefined;
    if (keys.client) {
      if (keys.clientKind === 'relation' && p[keys.client]?.relation?.[0]?.id) {
        client = await getPageTitle(p[keys.client].relation[0].id);
      } else {
        client = readTextish(p, keys.client);
      }
    }
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      status: readTextish(p, keys.status),
      client,
      location: readTextish(p, keys.location),
      builder: readTextish(p, keys.builder),
    }
  }))

  return { items, statusOptions }
}

export async function getProjectFull(id: string): Promise<{
  project: any;
  photos: Array<{ id: string; description: string; url: string }>;
  improvements: any[];
  tasks: any[];
  expenses: any[];
  time: any[];
}> {
  if (!PROJECTS_DB_ID) throw new Error('PROJECTS_DB_ID missing')
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const page: any = await notion.pages.retrieve({ page_id: id })
  const p = page.properties || {}

  let client: string | undefined;
  if (keys.client) {
    if (keys.clientKind === 'relation' && p[keys.client]?.relation?.[0]?.id) {
      client = await getPageTitle(p[keys.client].relation[0].id);
    } else {
      client = readTextish(p, keys.client);
    }
  }
  const proj = { id, title: readTitle(p, keys.title), client, location: readTextish(p, keys.location), builder: readTextish(p, keys.builder), status: readTextish(p, keys.status) }

  async function listRelated(dbId?: string, relationName = 'Project') {
    if (!dbId) return []
    const db: any = await notion.databases.retrieve({ database_id: dbId })
    const props = db.properties || {}
    const relKey = Object.keys(props).find(k => k === relationName && props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID)
    if (!relKey) return []
    return await queryAll({ database_id: dbId, filter: { property: relKey, relation: { contains: id } } as any })
  }
  
  const [impRows, taskRows, expRows, timeAndPhotoRows] = await Promise.all([
    listRelated(IMPROVEMENTS_DB_ID, 'Projects'),
    listRelated(TASKS_DB_ID, 'Projects'),
    listRelated(EXPENSES_DB_ID, 'Projects'),
    listRelated(TIME_DB_ID, 'Projects'),
  ]);

  const timeDbProps = TIME_DB_ID ? await notion.databases.retrieve({ database_id: TIME_DB_ID }).then(db => db.properties) : {};
  const filesKey = Object.keys(timeDbProps).find(k => timeDbProps[k].type === 'files');
  
  const photoRows = filesKey ? timeAndPhotoRows.filter(r => r.properties[filesKey]?.files?.length > 0) : [];
  const timeRows = filesKey ? timeAndPhotoRows.filter(r => !r.properties[filesKey]?.files?.length) : timeAndPhotoRows;

  const mapRelated = (rows: any[], typeMap: Record<string, string>) => rows.map((r) => {
    const p = r.properties || {};
    const item: any = { id: r.id };
    for (const [key, type] of Object.entries(typeMap)) {
      const propKey = Object.keys(p).find(k => p[k].type === type);
      if(!propKey) continue;
      if (type === 'title') item[key] = readTitle(p, propKey);
      else if (type === 'files') item[key] = readTextish(p, propKey);
      else item[key] = readTextish(p, propKey);
    }
    return item;
  });

  const photos = mapRelated(photoRows, { description: 'title', url: 'files' });
  
  return { project: proj, photos, improvements: [], tasks: [], expenses: [], time: [] };
}

export async function createPhotoEntry(input: { projectId: string; description: string; photoUrl: string }) {
  if (!TIME_DB_ID) throw new Error('Your TIME_DB_ID for photos is not configured.');

  const db: any = await notion.databases.retrieve({ database_id: TIME_DB_ID });
  const props = db.properties || {};

  const titleKey = Object.keys(props).find(k => props[k].type === 'title');
  const filesKey = Object.keys(props).find(k => props[k].type === 'files');
  const relationKey = Object.keys(props).find(k => props[k].type === 'relation' && props[k].relation?.database_id === PROJECTS_DB_ID);

  if (!titleKey || !filesKey || !relationKey) {
    throw new Error('Your "Time" database must have a Title, a Files & Media, and a Relation to Projects property.');
  }

  const properties: any = {
    [titleKey]: { title: [{ text: { content: input.description || 'Untitled Photo' } }] },
    [filesKey]: { files: [{ name: input.description || input.photoUrl, external: { url: input.photoUrl } }] },
    [relationKey]: { relation: [{ id: input.projectId }] },
  };

  await notion.pages.create({
    parent: { database_id: TIME_DB_ID },
    properties,
  } as any);
}