import { Client } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export const PROJECTS_DB_ID = (process.env.NOTION_PROJECTS_DB_ID || '').trim()
export const IMPROVEMENTS_DB_ID = (process.env.NOTION_IMPROVEMENTS_DB_ID || '').trim()

// ---------- Projects schema & helpers ----------
const PROJ_ALIASES = {
  title:     ['Project', 'Name', 'Title'] as const,
  status:    ['Status', 'Status 1', 'Construction Phase', 'Stage', 'State'] as const,
  client:    ['Client', 'Customer', 'Company'] as const,
  location:  ['Location', 'Address', 'Job Address', 'Site'] as const,
  deadline:  ['Deadline', 'Due Date', 'Due', 'Target Date', 'Date', 'Start Date'] as const,
  jobAcct:   ['Job Account Setup', 'Job Account Created'] as const,
  followUp:  ['Need follow-up'] as const,
  budget:    ['Budget', 'Total value'] as const,
  spent:     ['Spent', 'Total expenses', 'Expenses'] as const,
  invoiced:  ['Invoiced'] as const,
}

type ProjKeys = {
  title: string
  status?: string
  statusKind?: 'status' | 'select' | 'multi_select'
  client?: string
  location?: string
  deadline?: string
  jobAcct?: string
  followUp?: string
  budget?: string
  spent?: string
  invoiced?: string
}


const projCache = new Map<string, ProjKeys>()
const getPlain = (rt: any) => (Array.isArray(rt) ? rt[0]?.plain_text : undefined)

async function getProjectKeys(): Promise<ProjKeys> {
  if (!PROJECTS_DB_ID) throw new Error('Missing NOTION_PROJECTS_DB_ID')
  if (projCache.has(PROJECTS_DB_ID)) return projCache.get(PROJECTS_DB_ID)!
  const db = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
  const props = (db as any).properties as Record<string, any>
  const keys: Partial<ProjKeys> = {}
  for (const [logical, cands] of Object.entries(PROJ_ALIASES) as Array<[keyof typeof PROJ_ALIASES, ReadonlyArray<string>]>) {
    const found = cands.find(k => props[k])
    if (found) (keys as any)[logical] = found
  }
  if (keys.status) (keys as any).statusKind = (props[keys.status] as any)?.type as any

  if (!keys.title) {
    const auto = Object.entries(props).find(([, v]: any) => v?.type === 'title')?.[0]
    if (auto) keys.title = auto
  }
  if (!keys.title) throw new Error('Projects DB: no title property')
  projCache.set(PROJECTS_DB_ID, keys as ProjKeys)
  return keys as ProjKeys
}

// Generic pagination helper (Notion query)
async function getAll<T>(fn: (cursor?: string) => Promise<{ results: T[]; has_more: boolean; next_cursor: string | null }>) {
  let cursor: string | undefined = undefined
  const out: T[] = []
  // limit to reasonable pages to avoid runaway
  for (let i = 0; i < 20; i++) {
    const resp = await fn(cursor)
    out.push(...resp.results)
    if (!resp.has_more || !resp.next_cursor) break
    cursor = resp.next_cursor
  }
  return out
}

export type ProjectItem = {
  id: string
  title: string
  status?: string
  client?: string
  location?: string
  deadline?: string | null
  jobAccount?: boolean | null
  followUp?: boolean | null
  budget?: number | null
  spent?: number | null
  url?: string
}

export async function listProjects(params?: { q?: string; status?: string }) {
  const keys = await getProjectKeys()
  const and: any[] = []
  const q = params?.q?.trim()

  if (params?.status && params.status !== 'All' && keys.status) {
    const discriminator = keys.statusKind === 'status' ? 'status' : 'select'
    and.push({ property: keys.status, [discriminator]: { equals: params.status } })
  }
  if (q) {
    const or: any[] = []
    if (keys.title)    or.push({ property: keys.title,    title: { contains: q } })
    if (keys.client)   or.push({ property: keys.client,   rich_text: { contains: q } })
    if (keys.location) or.push({ property: keys.location, rich_text: { contains: q } })
    if (or.length) and.push({ or })
  }

  const filter = and.length ? { and } : undefined
  const sorts = keys.deadline ? [{ property: keys.deadline, direction: 'ascending' as const }] : undefined

  const results = await getAll<any>((cursor) =>
    notion.databases.query({
      database_id: PROJECTS_DB_ID,
      ...(filter && { filter }),
      ...(sorts && { sorts }),
      page_size: 100,
      ...(cursor && { start_cursor: cursor }),
    }) as any
  )

  const items: ProjectItem[] = results
    .filter(p => p.object === 'page')
    .map((page: any) => {
      const p = page.properties
      const statusVal =
        keys.status
          ? (keys.statusKind === 'status'
              ? p[keys.status]?.status?.name
              : p[keys.status]?.select?.name)
          : undefined
      return {
        id: page.id,
        title: p[keys.title!]?.title?.[0]?.plain_text ?? 'Untitled',
        status: statusVal,
        client: keys.client ? getPlain(p[keys.client]?.rich_text) : undefined,
        location: keys.location ? getPlain(p[keys.location]?.rich_text) : undefined,
        deadline: keys.deadline ? (p[keys.deadline]?.date?.start ?? null) : null,
        jobAccount: keys.jobAcct ? Boolean(p[keys.jobAcct]?.checkbox) : null,
        followUp: keys.followUp ? Boolean(p[keys.followUp]?.checkbox) : null,
        budget: keys.budget ? (p[keys.budget]?.number ?? null) : null,
        spent: keys.spent ? (p[keys.spent]?.number ?? null) : null,
        url: page.url
      }
    })

  // Status options for filters/columns
  let statusOptions: string[] = []
  try {
    const db = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
    const prop = keys.status ? (db as any).properties[keys.status] : null
    if (prop?.type === 'select')    statusOptions = (prop.select?.options || []).map((o: any) => o.name)
    else if (prop?.type === 'status') statusOptions = (prop.status?.options || []).map((o: any) => o.name)
  } catch {}
  if (!statusOptions.length) statusOptions = Array.from(new Set(items.map(i => i.status).filter(Boolean))) as string[]

  return { items, statusOptions, keys }
}


export async function listProjectOptions() {
  const keys = await getProjectKeys()
  const all = await listProjects()
  return all.items.map(i => ({ id: i.id, title: i.title })).sort((a, b) => a.title.localeCompare(b.title))
}

export async function countPostAndBeam() {
  const keys = await getProjectKeys()
  if (!keys.status) return 0

  const statusProp: string = keys.status
  const discriminator = keys.statusKind === 'status' ? 'status' : 'select'

  // Build the dynamic filter separately so TS doesn't choke
  const statusFilter: any = {
    property: statusProp,
    [discriminator]: { equals: 'Post & Beam' } // <-- change label if your option text differs
  }

  const results = await getAll<any>((cursor) =>
    notion.databases.query({
      database_id: PROJECTS_DB_ID,
      filter: statusFilter,
      page_size: 100,
      ...(cursor && { start_cursor: cursor }),
    }) as any
  )

  return results.length
}




export async function listBids() {
  const { items } = await listProjects()
  // Treat any status containing 'bid' or need follow-up as active bid
  const bids = items.filter(it =>
    (it.status && /bid/i.test(it.status)) || it.followUp === true
  )
  return bids
}

export async function listJobAccountPending() {
  const { items, keys } = await listProjects()
  if (!keys.jobAcct) return []
  return items.filter(it => it.jobAccount === false || it.jobAccount === null)
}

export async function toggleJobAccount(pageId: string, value: boolean) {
  const keys = await getProjectKeys()
  if (!keys.jobAcct) throw new Error('Projects DB has no "Job Account Setup" checkbox')
  await notion.pages.update({
    page_id: pageId,
    properties: { [keys.jobAcct]: { checkbox: value } }
  })
}

// ---------- Improvements (Upgrades / Problems) ----------
const IMP_ALIASES = {
  title:   ['Improvement', 'Title', 'Name'] as const,
  status:  ['Status', 'State'] as const,
  project: ['Projects', 'Project'] as const,
  action:  ['Action', 'Notes', 'Description'] as const,
}

type ImpKeys = {
  title: string
  status?: string
  statusKind?: 'status' | 'select' | 'multi_select'
  project?: string
  action?: string
}

const impCache = new Map<string, ImpKeys>()

async function getImprovementKeys(): Promise<ImpKeys> {
  if (!IMPROVEMENTS_DB_ID) throw new Error('Missing NOTION_IMPROVEMENTS_DB_ID')
  if (impCache.has(IMPROVEMENTS_DB_ID)) return impCache.get(IMPROVEMENTS_DB_ID)!
  const db = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = (db as any).properties as Record<string, any>
  const keys: Partial<ImpKeys> = {}

  for (const [logical, cands] of Object.entries(IMP_ALIASES) as Array<[keyof typeof IMP_ALIASES, ReadonlyArray<string>]>) {
    const found = cands.find(k => props[k])
    if (found) (keys as any)[logical] = found
  }
  if (keys.status) (keys as any).statusKind = (props[keys.status] as any)?.type as any

  if (!keys.title) {
    const auto = Object.entries(props).find(([, v]: any) => v?.type === 'title')?.[0]
    if (auto) keys.title = auto
  }
  if (!keys.title) throw new Error('Improvements DB: no title property')

  impCache.set(IMPROVEMENTS_DB_ID, keys as ImpKeys)
  return keys as ImpKeys
}

export type ImprovementItem = {
  id: string
  title: string
  status?: string
  projectId?: string
  action?: string
  url?: string
}

export async function listImprovements(params?: { projectId?: string; openOnly?: boolean }) {
  const keys = await getImprovementKeys()
  const and: any[] = []

  if (params?.projectId && keys.project) {
    and.push({ property: keys.project, relation: { contains: params.projectId } })
  }
  const filter = and.length ? { and } : undefined

  const results = await getAll<any>((cursor) =>
    notion.databases.query({
      database_id: IMPROVEMENTS_DB_ID,
      ...(filter && { filter }),
      page_size: 100,
      ...(cursor && { start_cursor: cursor }),
    }) as any
  )

  let items: ImprovementItem[] = results
    .filter(p => p.object === 'page')
    .map((page: any) => {
      const p = page.properties
      return {
        id: page.id,
        title: p[keys.title!]?.title?.[0]?.plain_text ?? 'Untitled',
        // 👇 THIS is the line you asked about — it supports Notion "status" OR "select"
        status: keys.status
          ? (keys.statusKind === 'status'
              ? p[keys.status]?.status?.name
              : p[keys.status]?.select?.name)
          : undefined,
        projectId: keys.project ? p[keys.project]?.relation?.[0]?.id : undefined,
        action: keys.action ? (Array.isArray(p[keys.action]?.rich_text) ? p[keys.action].rich_text[0]?.plain_text : undefined) : undefined,
        url: page.url,
      }
    })

  if (params?.openOnly && keys.status) {
    items = items.filter(i => !/done|resolved|closed|complete/i.test(i.status || ''))
  }
  return items
}

export async function createImprovement(input: { projectId: string; title: string; action?: string }) {
  const keys = await getImprovementKeys()
  const props: any = {
    [keys.title]: { title: [{ text: { content: input.title } }] }
  }
  if (keys.project) props[keys.project] = { relation: [{ id: input.projectId }] }
  if (keys.action && input.action) props[keys.action] = { rich_text: [{ text: { content: input.action } }] }
  if (keys.status) {
    props[keys.status] = keys.statusKind === 'status'
      ? { status: { name: 'Open' } }
      : { select: { name: 'Open' } }
  }
  const page = await notion.pages.create({ parent: { database_id: IMPROVEMENTS_DB_ID }, properties: props })
  return page.id
}

export async function updateImprovementStatus(pageId: string, newStatus: string) {
  const keys = await getImprovementKeys()
  if (!keys.status) throw new Error('Improvements DB has no Status')
  const payload = keys.statusKind === 'status'
    ? { status: { name: newStatus } }
    : { select: { name: newStatus } }
  await notion.pages.update({ page_id: pageId, properties: { [keys.status]: payload } })
}






