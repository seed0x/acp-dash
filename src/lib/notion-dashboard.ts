// src/lib/notion-dashboard.ts
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
  client?: string
  location?: string
  deadline?: string
  jobAcct?: string
  followUp?: string
  budget?: string
  spent?: string
  invoiced?: string
}

const schemaCache = new Map<string, ProjKeys>()
function getPlain(rt: any) { return Array.isArray(rt) ? rt[0]?.plain_text : undefined }

async function getProjectKeys(): Promise<ProjKeys> {
  if (!PROJECTS_DB_ID) throw new Error('Missing NOTION_PROJECTS_DB_ID')
  if (schemaCache.has(PROJECTS_DB_ID)) return schemaCache.get(PROJECTS_DB_ID)!
  const db = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
  const props = (db as any).properties as Record<string, any>
  const keys: Partial<ProjKeys> = {}

  for (const [logical, cands] of Object.entries(PROJ_ALIASES) as Array<[keyof typeof PROJ_ALIASES, ReadonlyArray<string>]>) {
    const found = cands.find(k => props[k])
    if (found) (keys as any)[logical] = found
  }
  if (!keys.title) {
    const auto = Object.entries(props).find(([, v]: any) => v?.type === 'title')?.[0]
    if (auto) keys.title = auto
  }
  if (!keys.title) throw new Error('Projects DB: no title property')

  schemaCache.set(PROJECTS_DB_ID, keys as ProjKeys)
  return keys as ProjKeys
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
    and.push({ property: keys.status, select: { equals: params.status } })
  }
  if (q) {
    const or: any[] = []
    if (keys.title)    or.push({ property: keys.title, title: { contains: q } })
    if (keys.client)   or.push({ property: keys.client, rich_text: { contains: q } })
    if (keys.location) or.push({ property: keys.location, rich_text: { contains: q } })
    if (or.length) and.push({ or })
  }

  const filter = and.length ? { and } : undefined
  const sorts = keys.deadline ? [{ property: keys.deadline, direction: 'ascending' as const }] : undefined

  const resp = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter && { filter }),
    ...(sorts && { sorts }),
    page_size: 100,
  })

  const items: ProjectItem[] = resp.results
    .filter(p => p.object === 'page')
    .map((page: any) => {
      const p = page.properties
      return {
        id: page.id,
        title: p[keys.title!]?.title?.[0]?.plain_text ?? 'Untitled',
        status: keys.status ? p[keys.status]?.select?.name : undefined,
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

  // status options for filters/columns
  let statusOptions: string[] = []
  try {
    const db = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
    const prop = keys.status ? (db as any).properties[keys.status] : null
    if (prop?.type === 'select') statusOptions = (prop.select?.options || []).map((o: any) => o.name)
  } catch {}
  if (!statusOptions.length) statusOptions = Array.from(new Set(items.map(i => i.status).filter(Boolean))) as string[]

  return { items, statusOptions, keys }
}

export async function countPostAndBeam() {
  const keys = await getProjectKeys()
  if (!keys.status) return 0
  const resp = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    filter: { property: keys.status, select: { equals: 'Post & Beam' } },
    page_size: 1
  })
  // Notion doesn't return total; quick client-side count: fetch first 100 and count
  // For simplicity we return first page length
  return resp.results.length
}

export async function listBids() {
  const { items } = await listProjects()
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

type ImpKeys = { title: string; status?: string; project?: string; action?: string }
const impCache = new Map<string, ImpKeys>()

async function getImprovementKeys(): Promise<ImpKeys> {
  if (!IMPROVEMENTS_DB_ID) throw new Error('Missing NOTION_IMPROVEMENTS_DB_ID')
  if (impCache.has(IMPROVEMENTS_DB_ID)) return impCache.get(IMPROVEMENTS_DB_ID)!
  const db = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = (db as any).properties
  const keys: Partial<ImpKeys> = {}
  for (const [logical, cands] of Object.entries(IMP_ALIASES) as Array<[keyof typeof IMP_ALIASES, ReadonlyArray<string>]>) {
    const found = cands.find(k => props[k])
    if (found) (keys as any)[logical] = found
  }
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

  const resp = await notion.databases.query({
    database_id: IMPROVEMENTS_DB_ID,
    ...(filter && { filter }),
    page_size: 100,
  })

  const items: ImprovementItem[] = resp.results
    .filter(p => p.object === 'page')
    .map((page: any) => {
      const p = page.properties
      return {
        id: page.id,
        title: p[keys.title!]?.title?.[0]?.plain_text ?? 'Untitled',
        status: keys.status ? p[keys.status]?.select?.name : undefined,
        projectId: keys.project ? p[keys.project]?.relation?.[0]?.id : undefined,
        action: keys.action ? getPlain(p[keys.action]?.rich_text) : undefined,
        url: page.url,
      }
    })

  if (params?.openOnly && keys.status) {
    return items.filter(i => !/done|resolved|closed|complete/i.test(i.status || ''))
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
  // default status to "Open" if the DB has an option named Open
  if (keys.status) props[keys.status] = { select: { name: 'Open' } }
  const page = await notion.pages.create({ parent: { database_id: IMPROVEMENTS_DB_ID }, properties: props })
  return page.id
}

export async function updateImprovementStatus(pageId: string, newStatus: string) {
  const keys = await getImprovementKeys()
  if (!keys.status) throw new Error('Improvements DB has no Status')
  await notion.pages.update({ page_id: pageId, properties: { [keys.status]: { select: { name: newStatus } } } })
}
