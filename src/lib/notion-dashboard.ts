// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

/** -------------------------------
 * Notion client + DB ID helpers
 * ------------------------------- */
export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

const env = (k: string) => process.env[k]

export const PROJECTS_DB_ID =
  env('NEXT_PUBLIC_NOTION_PROJECTS_DB_ID') || env('NOTION_PROJECTS_DB_ID') || env('PROJECTS_DB_ID') || ''

export const CLIENTS_DB_ID = 
  env('NEXT_PUBLIC_NOTION_CLIENTS_DB_ID') || env('NOTION_CLIENTS_DB_ID') || env('CLIENTS_DB_ID') || ''

export const IMPROVEMENTS_DB_ID =
  env('NEXT_PUBLIC_NOTION_IMPROVEMENTS_DB_ID') || env('NOTION_IMPROVEMENTS_DB_ID') || env('IMPROVEMENTS_DB_ID') || ''

export const TASKS_DB_ID =
  env('NEXT_PUBLIC_NOTION_TASKS_DB_ID') || env('NOTION_TASKS_DB_ID') || env('TASKS_DB_ID') || ''

export const EXPENSES_DB_ID =
  env('NEXT_PUBLIC_NOTION_EXPENSES_DB_ID') || env('NOTION_EXPENSES_DB_ID') || env('EXPENSES_DB_ID') || ''

export const TIME_DB_ID =
  env('NEXT_PUBLIC_NOTION_TIME_DB_ID') || env('NOTION_TIME_DB_ID') || env('TIME_DB_ID') || ''

export const NOTES_DB_ID =
  env('NEXT_PUBLIC_NOTION_NOTES_DB_ID') || env('NOTION_NOTES_DB_ID') || env('NOTES_DB_ID') || ''

export const DOCS_DB_ID =
  env('NEXT_PUBLIC_NOTION_DOCS_DB_ID') || env('NOTION_DOCS_DB_ID') || env('DOCS_DB_ID') || ''

/** -------------------------------
 * Flexible schema (Projects)
 * ------------------------------- */
type ProjectKeys = {
  title: string
  status?: string
  statusKind?: 'status' | 'select'
  client?: string
  clientKind?: 'relation' | 'text'
  location?: string
  builder?: string
  jobAccount?: string
  followUp?: string
  budget?: string
  spent?: string
  deadline?: string
}

const PROJECT_ALIASES: Record<keyof Omit<ProjectKeys, 'statusKind' | 'clientKind'>, readonly string[]> = {
  title: ['Project', 'Name', 'Title'],
  status: ['Status', 'Status 1', 'Pipeline', 'State'],
  client: ['Client', 'Customer', 'Account', 'Company', 'Contact'],
  location: ['Location', 'Address', 'Job Address', 'Job Address (text)'],
  builder: ['Builder', 'GC', 'General Contractor'],
  jobAccount: ['Job Account Setup', 'Job Account', 'Account Setup'],
  followUp: ['Need follow-up', 'Need Follow-up', 'Follow up', 'Follow-up', 'Follow Up'],
  budget: ['Budget'],
  spent: ['Spent', 'Budget spent'],
  deadline: ['Deadline', 'Due', 'Due Date'],
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
  const followUp = pick(PROJECT_ALIASES.followUp, p => ['checkbox', 'select', 'status'].includes(p.type))
  const budget = pick(PROJECT_ALIASES.budget, p => p.type === 'number')
  const spent = pick(PROJECT_ALIASES.spent, p => p.type === 'number')
  const deadline = pick(PROJECT_ALIASES.deadline, p => p.type === 'date')

  const statusKind: 'status' | 'select' | undefined =
    statusName && props[statusName]?.type === 'status' ? 'status' : statusName ? 'select' : undefined
  
  const clientKind: 'relation' | 'text' | undefined = 
    clientName && props[clientName]?.type === 'relation' && props[clientName]?.relation?.database_id === CLIENTS_DB_ID ? 'relation' : 'text';

  const keys: ProjectKeys = {
    title: title || Object.keys(props).find(k => props[k]?.type === 'title')!,
    status: statusName,
    statusKind,
    client: clientName,
    clientKind,
    location,
    builder,
    jobAccount,
    followUp,
    budget,
    spent,
    deadline,
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
  if (prop.type === 'url') return prop.url
  if (prop.type === 'email') return prop.email
  if (prop.type === 'phone_number') return prop.phone_number
  if (prop.type === 'number') return String(prop.number ?? '')
  if (prop.type === 'date') return prop.date?.start
  return undefined
}
function readNumber(p: any, key?: string): number | undefined {
  if (!key) return undefined
  const prop = p[key]
  if (prop?.type === 'number') return prop.number ?? undefined
  return undefined
}
function readCheckbox(p: any, key?: string): boolean | undefined {
  if (!key) return undefined
  const prop = p[key]
  if (prop?.type === 'checkbox') return !!prop.checkbox
  return undefined
}
function selectFilter(property: string, kind: 'status' | 'select', equals: string): any {
  return { property, [kind]: { equals } } as any
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

/** 1) KPI: count “Post & Beam” */
export async function countPostAndBeam(): Promise<number> {
  if (!PROJECTS_DB_ID) return 0
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  if (!keys.status || !keys.statusKind) return 0
  const MATCHES = ['Post & Beam', 'Post & Beams', 'Post & Beam Posts', 'Post & Beam / Posts & Beams']

  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    filter: { or: MATCHES.map(m => selectFilter(keys.status!, keys.statusKind!, m)) } as any,
    page_size: 50,
  })
  return results.length
}

/** 2) Active bids + follow-ups (light list) */
export async function listBids(): Promise<Array<{ id: string; title: string; client?: string; location?: string; status?: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const BID_STATUSES = ['Bid', 'Bidding', 'Active Bid', 'Estimating', 'Estimate', 'Proposal', 'Quote', 'Follow Up']

  const orFilters: any[] = []
  if (keys.status && keys.statusKind) {
    orFilters.push(...BID_STATUSES.map(s => selectFilter(keys.status!, keys.statusKind!, s)))
  }
  if (keys.followUp) {
    orFilters.push({ property: keys.followUp, checkbox: { equals: true } } as any)
    orFilters.push({ property: keys.followUp, select: { equals: 'Follow Up' } } as any)
    orFilters.push({ property: keys.followUp, status: { equals: 'Follow Up' } } as any)
  }

  const filter = orFilters.length ? { or: orFilters } : undefined
  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
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
      location: readTextish(p, keys.location),
      status: keys.status
        ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
        : undefined,
    }
  }))
}

/** 3) Projects missing Job Account Setup checkbox */
export async function listJobAccountPending(): Promise<Array<{ id: string; title: string; client?: string; location?: string; status?: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const filter: any = keys.jobAccount ? { property: keys.jobAccount, checkbox: { equals: false } } : undefined

  const results = await queryAll({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
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
      location: readTextish(p, keys.location),
      status: keys.status
        ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
        : undefined,
    }
  }))
}

/** 4) Toggle Job Account checkbox */
export async function toggleJobAccount(id: string, value: boolean): Promise<void> {
  if (!PROJECTS_DB_ID) return
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  if (!keys.jobAccount) return
  await notion.pages.update({
    page_id: id,
    properties: { [keys.jobAccount]: { checkbox: value } } as any,
  })
}

/** 5) Improvements (optionally openOnly) */
export async function listImprovements(openOnly?: boolean): Promise<Array<{ id: string; title: string; status?: string; projectId?: string }>> {
  if (!IMPROVEMENTS_DB_ID) return []
  const db: any = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = db.properties || {}

  const titleKey = Object.keys(props).find(k => props[k]?.type === 'title') || 'Title'
  const statusKey = Object.keys(props).find(k => ['status', 'select'].includes(props[k]?.type))
  const statusKind: 'status' | 'select' | undefined =
    statusKey && props[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
  const projectRel = Object.keys(props).find(
    k => props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID
  )

  const filter: any =
    openOnly && statusKey && statusKind
      ? { and: [{ property: statusKey, [statusKind]: { does_not_equal: 'Done' } }] }
      : undefined

  const res: any = await notion.databases.query({
    database_id: IMPROVEMENTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 100,
  })

  return res.results.map((r: any) => {
    const p = r.properties || {}
    const rel = (projectRel && p[projectRel]?.relation) || []
    return {
      id: r.id,
      title: readTitle(p, titleKey),
      status: statusKey
        ? (statusKind === 'status' ? p[statusKey]?.status?.name : p[statusKey]?.select?.name)
        : undefined,
      projectId: rel[0]?.id,
    }
  })
}

/** 6) Improvements: create */
export async function createImprovement(input: { projectId?: string; title: string; action?: string }) {
  if (!IMPROVEMENTS_DB_ID) throw new Error('IMPROVEMENTS_DB_ID missing')
  const db: any = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = db.properties || {}
  const titleKey = Object.keys(props).find(k => props[k]?.type === 'title') || 'Title'
  const actionKey = ['Action', 'Notes', 'Description'].find(k => props[k])
  const projectRel = Object.keys(props).find(
    k => props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID
  )

  const properties: any = {
    [titleKey]: { title: [{ type: 'text', text: { content: input.title } }] },
  }
  if (input.action && actionKey) {
    properties[actionKey] = { rich_text: [{ type: 'text', text: { content: input.action } }] }
  }
  if (input.projectId && projectRel) {
    properties[projectRel] = { relation: [{ id: input.projectId }] }
  }

  await notion.pages.create({
    parent: { database_id: IMPROVEMENTS_DB_ID },
    properties,
  } as any)
}

/** 7) Improvements: update status */
export async function updateImprovementStatus(id: string, status: string) {
  const db: any = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = db.properties || {}
  const statusKey = Object.keys(props).find(k => ['status', 'select'].includes(props[k]?.type))
  const statusKind: 'status' | 'select' | undefined =
    statusKey && props[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
  if (!statusKey || !statusKind) return
  await notion.pages.update({
    page_id: id,
    properties: { [statusKey]: { [statusKind]: { name: status } } } as any,
  })
}

/** 8) Lightweight project select options */
export async function listProjectOptions(): Promise<Array<{ id: string; title: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const res: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    page_size: 100,
  })
  return res.results.map((r: any) => ({ id: r.id, title: readTitle(r.properties || {}, keys.title) }))
}

/** 9) Board data + status options + search */
export async function listProjectsBoard(input: { q?: string; status?: string }): Promise<{
  items: Array<{ id: string; title: string; status?: string; client?: string; location?: string }>
  statusOptions: string[]
}> {
  if (!PROJECTS_DB_ID) return { items: [], statusOptions: [] }
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const db: any = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
  const props = db.properties || {}

  let statusOptions: string[] = []
  if (keys.status && keys.statusKind) {
    const optArr = props[keys.status]?.[keys.statusKind]?.options
    statusOptions = Array.isArray(optArr) ? optArr.map((o: any) => o.name).filter(Boolean) : []
  }

  const andFilters: any[] = []
  if (input.status && input.status !== 'All' && keys.status && keys.statusKind) {
    andFilters.push(selectFilter(keys.status, keys.statusKind, input.status))
  }

  const q = (input.q || '').trim()
  if (q) {
    const orFilters: any[] = [{ property: keys.title, title: { contains: q } }]
    if (keys.location) orFilters.push({ property: keys.location, rich_text: { contains: q } })
    // Note: Client relation search is client-side for simplicity
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
    }
  }))

  const filteredItems = q
    ? items.filter(item => 
        item.title.toLowerCase().includes(q.toLowerCase()) || 
        item.location?.toLowerCase().includes(q.toLowerCase()) ||
        item.client?.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return { items: filteredItems, statusOptions }
}

/** 10) Full project detail with totals */
export async function getProjectFull(id: string): Promise<{
  project: {
    id: string
    title: string
    client?: string
    location?: string
    builder?: string
    status?: string
    jobAccount?: boolean
    followUp?: boolean | string
    budget?: number
    spent?: number
    deadline?: string
    totalExpenses?: number
    totalHours?: number
    openTasks?: number
    openImprovements?: number
  }
  improvements: Array<{ id: string; title: string; status?: string }>
  tasks: Array<{ id: string; title: string; status?: string; assignee?: string; due?: string }>
  expenses: Array<{ id: string; name: string; category?: string; value?: number }>
  time: Array<{ id: string; name: string; person?: string; date?: string; hours?: number }>
  notes: Array<{ id: string; title: string; created?: string }>
  docs: Array<{ id: string; title: string; description?: string }>
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

  const proj = {
    id,
    title: readTitle(p, keys.title),
    client,
    location: readTextish(p, keys.location),
    builder: readTextish(p, keys.builder),
    status: readTextish(p, keys.status),
    jobAccount: readCheckbox(p, keys.jobAccount),
    followUp: keys.followUp ? (p[keys.followUp]?.type === 'checkbox' ? !!p[keys.followUp]?.checkbox : readTextish(p, keys.followUp)) : undefined,
    budget: readNumber(p, keys.budget),
    spent: readNumber(p, keys.spent),
    deadline: readTextish(p, keys.deadline),
  }

  async function listRelated(dbId?: string) {
    if (!dbId) return []
    const db: any = await notion.databases.retrieve({ database_id: dbId })
    const props = db.properties || {}
    const relKey = Object.keys(props).find(k => props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID)
    if (!relKey) return []
    return await queryAll({ database_id: dbId, filter: { property: relKey, relation: { contains: id } } as any })
  }

  const [impRows, taskRows, expRows, timeRows, noteRows, docRows] = await Promise.all([
    listRelated(IMPROVEMENTS_DB_ID),
    listRelated(TASKS_DB_ID),
    listRelated(EXPENSES_DB_ID),
    listRelated(TIME_DB_ID),
    listRelated(NOTES_DB_ID),
    listRelated(DOCS_DB_ID),
  ]);

  const improvements = impRows.map((r: any) => ({ id: r.id, title: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), status: readTextish(r.properties, Object.keys(r.properties).find(k => ['status', 'select'].includes(r.properties[k].type))) }));
  const tasks = taskRows.map((r: any) => ({ id: r.id, title: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), status: readTextish(r.properties, Object.keys(r.properties).find(k => ['status', 'select'].includes(r.properties[k].type))), assignee: r.properties[Object.keys(r.properties).find(k => r.properties[k].type === 'people')]?.people?.[0]?.name, due: r.properties[Object.keys(r.properties).find(k => r.properties[k].type === 'date')]?.date?.start }));
  const expenses = expRows.map((r: any) => ({ id: r.id, name: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), category: readTextish(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'select')), value: readNumber(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'number')) }));
  const time = timeRows.map((r: any) => ({ id: r.id, name: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), person: r.properties[Object.keys(r.properties).find(k => r.properties[k].type === 'people')]?.people?.[0]?.name, date: r.properties[Object.keys(r.properties).find(k => r.properties[k].type === 'date')]?.date?.start, hours: readNumber(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'number')) }));
  const notes = noteRows.map((r: any) => ({ id: r.id, title: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), created: r.properties[Object.keys(r.properties).find(k => r.properties[k].type === 'created_time')]?.created_time }));
  const docs = docRows.map((r: any) => ({ id: r.id, title: readTitle(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'title')!), description: readTextish(r.properties, Object.keys(r.properties).find(k => r.properties[k].type === 'rich_text')) }));

  const totalExpenses = expenses.reduce((s, e) => s + (e.value || 0), 0)
  const totalHours = time.reduce((s, t) => s + (t.hours || 0), 0)
  const openTasks = tasks.filter(t => t.status?.toLowerCase() !== 'done').length
  const openImprovements = improvements.filter(i => i.status?.toLowerCase() !== 'done').length

  return { project: { ...proj, totalExpenses, totalHours, openTasks, openImprovements }, improvements, tasks, expenses, time, notes, docs }
}