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
export const TIME_DB_ID = env('TIME_DB_ID') // Used for Photos
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

// Helper to resolve relation page titles
const titleCache = new Map<string, string>();
async function getPageTitle(pageId: string): Promise<string> {
  if (titleCache.has(pageId)) return titleCache.get(pageId)!;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const titleProp = Object.values(page.properties).find((p: any) => p?.type === 'title') as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    titleCache.set(pageId, title);
    return title;
  } catch { return 'Untitled Relation' }
}

async function getProjectKeys(dbId: string): Promise<ProjectKeys> {
  if (projectKeyCache.has(dbId)) return projectKeyCache.get(dbId)!;
  const db: any = await notion.databases.retrieve({ database_id: dbId });
  const props = db.properties || {};
  const pick = (cands: readonly string[], accept?: (p: any) => boolean) => {
    for (const name of cands) {
      if (props[name] && (!accept || accept(props[name]))) return name;
    }
  };
  const clientName = pick(PROJECT_ALIASES.client);
  const keys: ProjectKeys = {
    title: pick(PROJECT_ALIASES.title, p => p.type === 'title') || 'Name',
    status: pick(PROJECT_ALIASES.status, p => p.type === 'status' || p.type === 'select'),
    client: clientName,
    clientKind: clientName && props[clientName]?.type === 'relation' ? 'relation' : 'text',
    location: pick(PROJECT_ALIASES.location),
    builder: pick(PROJECT_ALIASES.builder),
    jobAccount: pick(PROJECT_ALIASES.jobAccount, p => p.type === 'checkbox'),
  };
  projectKeyCache.set(dbId, keys);
  return keys;
}

/** -------------------------------
 * Property readers
 * ------------------------------- */
const readTitle = (p: any, key: string) => p?.[key]?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
const readTextish = (p: any, key?: string) => {
  if (!key || !p[key]) return undefined;
  const prop = p[key];
  if (prop.type === 'rich_text') return prop.rich_text.map((t: any) => t.plain_text).join('');
  if (prop.type === 'select') return prop.select?.name;
  if (prop.type === 'status') return prop.status?.name;
  if (prop.type === 'files') return prop.files?.[0]?.file?.url;
  return undefined;
};

const queryAll = async (opts: any) => {
  let results: any[] = [];
  let next_cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({ ...opts, start_cursor: next_cursor });
    results = results.concat(res.results);
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return results;
};

/** -------------------------------
 * Public dashboard functions
 * ------------------------------- */
export const countPostAndBeam = async (): Promise<number> => 0; // Placeholder
export const listBids = async (): Promise<any[]> => []; // Placeholder

export async function listJobAccountPending(): Promise<Array<{ id: string; title: string; client?: string }>> {
  if (!PROJECTS_DB_ID) return [];
  const keys = await getProjectKeys(PROJECTS_DB_ID);
  if (!keys.jobAccount) return [];

  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    filter: { property: keys.jobAccount, checkbox: { equals: false } },
  });

  return Promise.all(results.map(async (r: any) => {
    const p = r.properties || {};
    const client = keys.client ? (keys.clientKind === 'relation' && p[keys.client].relation?.[0] ? await getPageTitle(p[keys.client].relation[0].id) : readTextish(p, keys.client)) : undefined;
    return { id: r.id, title: readTitle(p, keys.title), client };
  }));
}

export async function listImprovements(openOnly?: boolean): Promise<Array<{ id: string; title: string; status?: string }>> {
  if (!IMPROVEMENTS_DB_ID) return [];
  const results = await queryAll({
    database_id: IMPROVEMENTS_DB_ID,
    ...(openOnly && { filter: { property: "Status", status: { does_not_equal: "Done" } } })
  });
  return results.map(r => ({
    id: r.id,
    title: readTitle(r.properties, 'Name'),
    status: readTextish(r.properties, 'Status'),
  }));
}

export async function createImprovement(input: { projectId: string; title: string }) {
  if (!IMPROVEMENTS_DB_ID) throw new Error('IMPROVEMENTS_DB_ID missing');
  await notion.pages.create({
    parent: { database_id: IMPROVEMENTS_DB_ID },
    properties: {
      'Name': { title: [{ text: { content: input.title } }] },
      'Projects': { relation: [{ id: input.projectId }] }
    }
  } as any);
}

export async function updateImprovementStatus(id: string, status: string) {
    if (!IMPROVEMENTS_DB_ID) return;
    await notion.pages.update({ page_id: id, properties: { 'Status': { status: { name: status } } } } as any);
}

export async function toggleJobAccount(id: string, value: boolean) {
    if (!PROJECTS_DB_ID) return;
    const keys = await getProjectKeys(PROJECTS_DB_ID);
    if (keys.jobAccount) {
        await notion.pages.update({ page_id: id, properties: { [keys.jobAccount]: { checkbox: value } } } as any);
    }
}

export async function listProjectOptions(): Promise<Array<{ id: string; title: string }>> {
  if (!PROJECTS_DB_ID) return [];
  const keys = await getProjectKeys(PROJECTS_DB_ID);
  const results = await queryAll({ database_id: PROJECTS_DB_ID, page_size: 100 });
  return results.map(r => ({ id: r.id, title: readTitle(r.properties, keys.title) }));
}

export async function listProjectsBoard(input: { q?: string; status?: string }): Promise<{
  items: Array<{ id: string; title: string; status?: string; client?: string; location?: string; builder?: string; }>
  statusOptions: string[]
}> {
  if (!PROJECTS_DB_ID) return { items: [], statusOptions: [] };
  const keys = await getProjectKeys(PROJECTS_DB_ID);
  const db: any = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID });
  const statusOptions = db.properties[keys.status!]?.select?.options.map((o: any) => o.name) || [];

  const filters: any[] = [];
  if (input.status && input.status !== 'All') {
    filters.push({ property: keys.status!, select: { equals: input.status } });
  }
  if (input.q) {
    filters.push({
      or: [
        { property: keys.title, title: { contains: input.q } },
        ...(keys.location ? [{ property: keys.location, rich_text: { contains: input.q } }] : []),
      ]
    });
  }
  
  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    ...(filters.length > 0 && { filter: { and: filters } })
  });

  const items = await Promise.all(results.map(async (r: any) => {
    const p = r.properties || {};
    const client = keys.client ? (keys.clientKind === 'relation' && p[keys.client].relation?.[0] ? await getPageTitle(p[keys.client].relation[0].id) : readTextish(p, keys.client)) : undefined;
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      status: readTextish(p, keys.status),
      client,
      location: readTextish(p, keys.location),
      builder: readTextish(p, keys.builder),
    };
  }));

  return { items, statusOptions };
}

export async function getProjectFull(id: string): Promise<any> {
    if (!PROJECTS_DB_ID) throw new Error('PROJECTS_DB_ID missing');
    const keys = await getProjectKeys(PROJECTS_DB_ID);
    const page: any = await notion.pages.retrieve({ page_id: id });
    const p = page.properties || {};

    const client = keys.client ? (keys.clientKind === 'relation' && p[keys.client].relation?.[0] ? await getPageTitle(p[keys.client].relation[0].id) : readTextish(p, keys.client)) : undefined;
    const project = { id, title: readTitle(p, keys.title), client, location: readTextish(p, keys.location), builder: readTextish(p, keys.builder), status: readTextish(p, keys.status) };

    const timeAndPhotoRows = TIME_DB_ID ? await queryAll({ database_id: TIME_DB_ID, filter: { property: 'Projects', relation: { contains: id } } }) : [];
    
    const timeDbProps = TIME_DB_ID ? await notion.databases.retrieve({ database_id: TIME_DB_ID }).then(db => db.properties) : {};
    const filesKey = Object.keys(timeDbProps).find(k => timeDbProps[k].type === 'files');
    const titleKey = Object.keys(timeDbProps).find(k => timeDbProps[k].type === 'title');

    const photos = (filesKey && titleKey) ? timeAndPhotoRows
        .filter(r => r.properties[filesKey]?.files?.length > 0)
        .map(r => ({ id: r.id, description: readTitle(r.properties, titleKey), url: r.properties[filesKey].files[0].file.url }))
        : [];

    return { project, photos, improvements: [], tasks: [], expenses: [], time: [] };
}

export async function createPhotoEntry(input: { projectId: string; description: string; photoUrl: string }) {
  if (!TIME_DB_ID) throw new Error('TIME_DB_ID for photos is not configured.');
  await notion.pages.create({
    parent: { database_id: TIME_DB_ID },
    properties: {
      'Name': { title: [{ text: { content: input.description || 'Untitled Photo' } }] },
      'Photo': { files: [{ name: input.description || input.photoUrl, external: { url: input.photoUrl } }] },
      'Projects': { relation: [{ id: input.projectId }] },
    }
  } as any);
}