// src/lib/notion-projects.ts
import { Client } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })
export const PROJECTS_DB_ID = (process.env.NOTION_PROJECTS_DB_ID || '').trim()

export type ProjectItem = {
  id: string
  title: string
  status?: string
  client?: string
  location?: string
  deadline?: string | null
  budget?: number | null
  spent?: number | null
  invoiced?: boolean | null
  url?: string
}

const ALIASES = {
  title:     ['Project', 'Name', 'Title'] as const,
  status:    ['Status', 'Status 1', 'Stage', 'State'] as const,
  client:    ['Client', 'Customer', 'Client Name', 'Company'] as const,
  location:  ['Location', 'Job Address', 'Address', 'Site'] as const,
  deadline:  ['Deadline', 'Due', 'Due Date', 'Target Date', 'Date', 'Start Date'] as const,
  budget:    ['Budget', 'Budget spent', 'Total value'] as const,
  spent:     ['Spent', 'Total expenses', 'Expenses'] as const,
  invoiced:  ['Invoiced'] as const,
} as const

function pickProp(props: Record<string, any>, candidates: ReadonlyArray<string>) {
  for (const k of candidates) if (props[k]) return k
}

type Keys = {
  title: string
  status?: string
  client?: string
  location?: string
  deadline?: string
  budget?: string
  spent?: string
  invoiced?: string
}

const schemaCache = new Map<string, Keys>()

async function getKeys(dbId: string): Promise<Keys> {
  if (schemaCache.has(dbId)) return schemaCache.get(dbId)!
  const db = await notion.databases.retrieve({ database_id: dbId })
  const props = (db as any).properties as Record<string, any>

  const keys: Partial<Keys> = {}
  // aliases
  for (const [logical, cands] of Object.entries(ALIASES) as Array<[keyof typeof ALIASES, ReadonlyArray<string>]>) {
    const found = cands.find(k => props[k])
    if (found) (keys as any)[logical] = found
  }
  // ensure title
  if (!keys.title) {
    const auto = Object.entries(props).find(([, v]: any) => v?.type === 'title')?.[0]
    if (auto) keys.title = auto
  }
  if (!keys.title) throw new Error('Projects DB: no title property')

  schemaCache.set(dbId, keys as Keys)
  return keys as Keys
}

const getPlain = (rt: any) => (Array.isArray(rt) ? rt[0]?.plain_text : undefined)

export async function listProjects(params: { q?: string; status?: string }) {
  if (!PROJECTS_DB_ID) throw new Error('Missing NOTION_PROJECTS_DB_ID')

  const keys = await getKeys(PROJECTS_DB_ID)
  const and: any[] = []

  if (params.status && params.status !== 'All' && keys.status) {
    and.push({ property: keys.status, select: { equals: params.status } })
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim()
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
        budget: keys.budget ? (p[keys.budget]?.number ?? null) : null,
        spent: keys.spent ? (p[keys.spent]?.number ?? null) : null,
        invoiced: keys.invoiced ? Boolean(p[keys.invoiced]?.checkbox) : null,
        url: page.url,
      }
    })

  // Also return the distinct status options (for column headings and filter)
  // If schema exposes select options, prefer them; else derive from data
  let statusOptions: string[] = []
  try {
    const db = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID })
    const prop = keys.status ? (db as any).properties[keys.status] : null
    if (prop?.type === 'select' && Array.isArray(prop.select?.options)) {
      statusOptions = prop.select.options.map((o: any) => o.name)
    }
  } catch {}
  if (!statusOptions.length) {
    statusOptions = Array.from(new Set(items.map(i => i.status).filter(Boolean))) as string[]
  }

  return { items, statusOptions }
}
