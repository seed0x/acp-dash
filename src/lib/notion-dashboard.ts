// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client';

if (!process.env.NOTION_TOKEN) {
  console.warn('NOTION_TOKEN is not set. /api/* will return 401.');
}

export const notion = new Client({ auth: process.env.NOTION_TOKEN ?? undefined });

/**
 * === Your database IDs (from your dump) ===
 */
export const DB = {
  projects: '223333490a11817390abe4872289edaf',
  tasks: '223333490a118175b75cedd489d8fc9e',
  clients: '223333490a11815fb8dfed884cb88a09',
  expenses: '223333490a118162b8dec59721702e1c',
  improvements: '223333490a1181efbdefdf74b0b4f6a6',
  docs: '223333490a11816bbcd0f0aedc40628c',
  software: '223333490a1181a49c3bc4d3e7a085ff', // not used below
  time: '223333490a11819cbe48f931fa6ad4b2',
  notes: '223333490a1181898ee6c4e52f1d07cb',
} as const;

type PropMap = Record<string, any>;
type DbMeta = {
  id: string;
  title: string;
  props: PropMap;
};

const cache: Record<string, DbMeta> = {};

/** Load & cache db metadata */
async function getDbMeta(id: string): Promise<DbMeta> {
  if (cache[id]) return cache[id];
  const db: any = await notion.databases.retrieve({ database_id: id as string });
  const title = (db?.title?.[0]?.plain_text ?? '').trim();
  const meta: DbMeta = { id, title, props: db?.properties ?? {} };
  cache[id] = meta;
  return meta;
}

/** pick first candidate prop that exists on a DB */
function pickProp(props: PropMap, candidates: string[]): string | undefined {
  for (const c of candidates) if (props[c]) return c;
  return undefined;
}

/** Get project property keys (flexible names) + kinds */
async function getProjectKeys() {
  const meta = await getDbMeta(DB.projects);
  const p = meta.props;

  const title = pickProp(p, ['Project', 'Title', 'Name']) ?? Object.keys(p).find(k => p[k]?.type === 'title');
  const status = pickProp(p, ['Status', 'Status 1']) ?? Object.keys(p).find(k => ['select', 'status'].includes(p[k]?.type));
  const statusKind = status ? p[status].type : undefined; // 'status' or 'select'
  const client = pickProp(p, ['Client']);
  const location = pickProp(p, ['Location', 'Address', 'Job Address', 'Sub-Division']);
  const deadline = pickProp(p, ['Deadline']);
  const followUp = pickProp(p, ['Need follow-up']);
  const jobAccount = pickProp(p, ['Job Account Setup']);
  const budget = pickProp(p, ['Budget']);
  const spent = pickProp(p, ['Spent', 'Budget spent']);

  return { title, status, statusKind, client, location, deadline, followUp, jobAccount, budget, spent, props: p };
}

/** Helpers to read Notion values safely */
function textOf(prop: any): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'title' || prop.type === 'rich_text') {
    const arr = prop[prop.type] as any[];
    return (arr ?? []).map(x => x?.plain_text ?? '').join('').trim() || undefined;
  }
  if (prop.type === 'formula') {
    const f = prop.formula;
    if (f.type === 'string') return f.string ?? undefined;
    if (f.type === 'number') return String(f.number ?? '');
  }
  return undefined;
}
function selectName(prop: any): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'select') return prop.select?.name;
  if (prop.type === 'status') return prop.status?.name;
  return undefined;
}
function numberVal(prop: any): number | undefined {
  if (!prop) return undefined;
  if (prop.type === 'number') return prop.number ?? undefined;
  if (prop.type === 'rollup' && prop.rollup?.type === 'number') return prop.rollup.number ?? undefined;
  return undefined;
}
function dateStr(prop: any): string | undefined {
  if (!prop) return undefined;
  if (prop.type === 'date') return prop.date?.start ?? undefined;
  return undefined;
}
function checkbox(prop: any): boolean | undefined {
  if (!prop) return undefined;
  if (prop.type === 'checkbox') return !!prop.checkbox;
  return undefined;
}

/** Build a NOTION filter for "contains" depending on property type */
function containsFilter(propName: string, kind: string | undefined, q: string) {
  if (!propName) return undefined;
  if (kind === 'title') return { property: propName, title: { contains: q } };
  if (kind === 'rich_text') return { property: propName, rich_text: { contains: q } };
  // If unknown, try both (Notion will error if wrong; we guard by knowing kinds below)
  return { property: propName, rich_text: { contains: q } } as any;
}

/** Query all pages of a database with optional filter (simple paginator) */
async function queryAll(dbId: string, body: any) {
  let results: any[] = [];
  let cursor: string | undefined;
  do {
    const resp: any = await notion.databases.query({ database_id: dbId, ...body, ...(cursor ? { start_cursor: cursor } : {}) });
    results = results.concat(resp.results || []);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return results;
}

/** List projects for board with server-side search + status filter */
export async function listProjectsBoard(params: { q?: string; status?: string }) {
  const { q, status } = params;
  const keys = await getProjectKeys();
  const filtersAnd: any[] = [];
  const or: any[] = [];

  if (q && q.trim()) {
    const tKind = keys.title ? 'title' : undefined;
    if (keys.title) or.push(containsFilter(keys.title, tKind, q.trim()));
    if (keys.location) or.push(containsFilter(keys.location, 'rich_text', q.trim()));
    // If there’s no valid OR entry, skip OR
    if (or.length) filtersAnd.push({ or });
  }

  if (status && status !== 'All' && keys.status) {
    const discriminator = keys.statusKind === 'status' ? 'status' : 'select';
    filtersAnd.push({ property: keys.status, [discriminator]: { equals: status } });
  }

  const pages = await queryAll(DB.projects, {
    filter: filtersAnd.length ? { and: filtersAnd } : undefined,
    page_size: 100,
    sorts: keys.status ? [{ property: keys.status, direction: 'ascending' as const }] : undefined,
  });

  const items = pages.map((pg: any) => {
    const p = pg.properties || {};
    return {
      id: pg.id,
      title: keys.title ? textOf(p[keys.title]) : 'Untitled',
      status: keys.status ? selectName(p[keys.status]) : undefined,
      client: keys.client ? (p[keys.client]?.relation?.length ? `${p[keys.client].relation.length} client(s)` : textOf(p[keys.client])) : undefined,
      location: keys.location ? textOf(p[keys.location]) : undefined,
    };
  });

  // collect unique status options for filter dropdown
  const statusOptions: string[] = [];
  for (const pg of pages) {
    const s = keys.status ? selectName(pg.properties?.[keys.status]) : undefined;
    if (s && !statusOptions.includes(s)) statusOptions.push(s);
  }
  statusOptions.sort((a, b) => a.localeCompare(b));

  return { items, statusOptions };
}

/** Find the relation property on a DB that points to Projects DB */
async function relationToProjectsProp(dbId: string): Promise<string | undefined> {
  const meta = await getDbMeta(dbId);
  for (const [name, cfg] of Object.entries<any>(meta.props)) {
    if (cfg?.type === 'relation' && cfg?.relation?.database_id === DB.projects) return name;
  }
  // fallback: common names
  return pickProp(meta.props, ['Projects', 'Project']);
}

/** Get one project + all linked data across other DBs */
export async function getProjectFull(projectId: string) {
  const keys = await getProjectKeys();
  const page: any = await notion.pages.retrieve({ page_id: projectId });

  const p = page.properties || {};
  const project = {
    id: page.id,
    title: keys.title ? textOf(p[keys.title]) : 'Untitled',
    status: keys.status ? selectName(p[keys.status]) : undefined,
    client: keys.client ? (p[keys.client]?.relation?.length ? `${p[keys.client].relation.length} client(s)` : textOf(p[keys.client])) : undefined,
    location: keys.location ? textOf(p[keys.location]) : undefined,
    deadline: keys.deadline ? dateStr(p[keys.deadline]) : undefined,
    followUp: keys.followUp ? checkbox(p[keys.followUp]) : undefined,
    jobAccount: keys.jobAccount ? checkbox(p[keys.jobAccount]) : undefined,
    budget: keys.budget ? numberVal(p[keys.budget]) : undefined,
    spent: keys.spent ? numberVal(p[keys.spent]) : undefined,
  };

  // --- Linked DB helpers
  async function viaRelation(dbId: string, mapRow: (props: any, id: string) => any) {
    const relProp = await relationToProjectsProp(dbId);
    if (!relProp) return [];
    const rows = await queryAll(dbId, {
      filter: { property: relProp, relation: { contains: projectId } },
      page_size: 100,
    });
    return rows.map((r: any) => mapRow(r.properties, r.id));
  }

  // Tasks
  const tasksMeta = await getDbMeta(DB.tasks);
  const taskTitle = pickProp(tasksMeta.props, ['Task', 'Title', 'Name']) ?? Object.keys(tasksMeta.props).find(k => tasksMeta.props[k].type === 'title');
  const taskStatus = pickProp(tasksMeta.props, ['Status']);
  const taskAssignee = pickProp(tasksMeta.props, ['Asignee', 'Assignee', 'Person']);
  const taskDue = pickProp(tasksMeta.props, ['Due Date', 'Due']);

  const tasks = await viaRelation(DB.tasks, (props, id) => ({
    id,
    title: taskTitle ? textOf(props[taskTitle]) : 'Untitled',
    status: taskStatus ? selectName(props[taskStatus]) : undefined,
    assignee: taskAssignee ? textOf(props[taskAssignee]) : undefined,
    due: taskDue ? dateStr(props[taskDue]) : undefined,
  }));

  // Improvements / Upgrades
  const impMeta = await getDbMeta(DB.improvements);
  const impTitle = pickProp(impMeta.props, ['Improvement', 'Title', 'Name']) ?? Object.keys(impMeta.props).find(k => impMeta.props[k].type === 'title');
  const impStatus = pickProp(impMeta.props, ['Status']);
  const impAction = pickProp(impMeta.props, ['Action']);

  const improvements = await viaRelation(DB.improvements, (props, id) => ({
    id,
    title: impTitle ? textOf(props[impTitle]) : 'Untitled',
    status: impStatus ? selectName(props[impStatus]) : undefined,
    action: impAction ? textOf(props[impAction]) : undefined,
  }));

  // Expenses
  const expMeta = await getDbMeta(DB.expenses);
  const expName = pickProp(expMeta.props, ['Name', 'Title']) ?? Object.keys(expMeta.props).find(k => expMeta.props[k].type === 'title');
  const expCat = pickProp(expMeta.props, ['Category']);
  const expVal = pickProp(expMeta.props, ['Value']);

  const expenses = await viaRelation(DB.expenses, (props, id) => ({
    id,
    name: expName ? textOf(props[expName]) : 'Untitled',
    category: expCat ? selectName(props[expCat]) ?? textOf(props[expCat]) : undefined,
    value: expVal ? numberVal(props[expVal]) ?? 0 : 0,
  }));

  // Time
  const timeMeta = await getDbMeta(DB.time);
  const tName = pickProp(timeMeta.props, ['Name', 'Title']) ?? Object.keys(timeMeta.props).find(k => timeMeta.props[k].type === 'title');
  const tPerson = pickProp(timeMeta.props, ['Person']);
  const tDate = pickProp(timeMeta.props, ['Date', 'Created time']);
  const tHours = pickProp(timeMeta.props, ['Hours']);

  const time = await viaRelation(DB.time, (props, id) => ({
    id,
    name: tName ? textOf(props[tName]) : 'Entry',
    person: tPerson ? textOf(props[tPerson]) : undefined,
    date: tDate ? dateStr(props[tDate]) : undefined,
    hours: tHours ? numberVal(props[tHours]) ?? 0 : 0,
  }));

  // Notes
  const notesMeta = await getDbMeta(DB.notes);
  const nTitle = pickProp(notesMeta.props, ['Name', 'Title']) ?? Object.keys(notesMeta.props).find(k => notesMeta.props[k].type === 'title');
  const nCreated = pickProp(notesMeta.props, ['Created Date', 'Created time', 'Last edited time']);

  const notes = await viaRelation(DB.notes, (props, id) => ({
    id,
    title: nTitle ? textOf(props[nTitle]) : 'Note',
    created: nCreated ? dateStr(props[nCreated]) : undefined,
  }));

  // Docs
  const docsMeta = await getDbMeta(DB.docs);
  const dTitle = pickProp(docsMeta.props, ['Title', 'Name']) ?? Object.keys(docsMeta.props).find(k => docsMeta.props[k].type === 'title');
  const dDesc = pickProp(docsMeta.props, ['Description']);

  const docs = await viaRelation(DB.docs, (props, id) => ({
    id,
    title: dTitle ? textOf(props[dTitle]) : 'Doc',
    description: dDesc ? textOf(props[dDesc]) : undefined,
  }));

  // quick totals
  const totals = {
    totalExpenses: expenses.reduce((a, b) => a + (b.value ?? 0), 0),
    totalHours: time.reduce((a, b) => a + (b.hours ?? 0), 0),
    openTasks: tasks.filter(t => (t.status ?? '').toLowerCase() !== 'done' && (t.status ?? '').toLowerCase() !== 'completed').length,
    openImprovements: improvements.filter(i => (i.status ?? '').toLowerCase() !== 'done' && (i.status ?? '').toLowerCase() !== 'completed').length,
  };

  return { project: { ...project, ...totals }, tasks, improvements, expenses, time, notes, docs };
}

