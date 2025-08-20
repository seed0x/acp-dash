// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

/** ----------------------
 *  Notion client & DB IDs
 *  ---------------------- */
export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

const env = (k: string) => process.env[k]

export const PROJECTS_DB_ID =
  env('NEXT_PUBLIC_NOTION_PROJECTS_DB_ID') ||
  env('NOTION_PROJECTS_DB_ID') ||
  env('PROJECTS_DB_ID') ||
  '' // fill via env

export const IMPROVEMENTS_DB_ID =
  env('NEXT_PUBLIC_NOTION_IMPROVEMENTS_DB_ID') ||
  env('NOTION_IMPROVEMENTS_DB_ID') ||
  env('IMPROVEMENTS_DB_ID') ||
  ''

export const TASKS_DB_ID =
  env('NEXT_PUBLIC_NOTION_TASKS_DB_ID') ||
  env('NOTION_TASKS_DB_ID') ||
  env('TASKS_DB_ID') ||
  ''

export const EXPENSES_DB_ID =
  env('NEXT_PUBLIC_NOTION_EXPENSES_DB_ID') ||
  env('NOTION_EXPENSES_DB_ID') ||
  env('EXPENSES_DB_ID') ||
  ''

export const TIME_DB_ID =
  env('NEXT_PUBLIC_NOTION_TIME_DB_ID') ||
  env('NOTION_TIME_DB_ID') ||
  env('TIME_DB_ID') ||
  ''

export const NOTES_DB_ID =
  env('NEXT_PUBLIC_NOTION_NOTES_DB_ID') ||
  env('NOTION_NOTES_DB_ID') ||
  env('NOTES_DB_ID') ||
  ''

export const DOCS_DB_ID =
  env('NEXT_PUBLIC_NOTION_DOCS_DB_ID') ||
  env('NOTION_DOCS_DB_ID') ||
  env('DOCS_DB_ID') ||
  ''

/** ----------------------
 *  Flexible schema mapping
 *  ---------------------- */

type ProjectKeys = {
  title: string
  status?: string
  statusKind?: 'status' | 'select'
  client?: string
  location?: string
  jobAccount?: string
  followUp?: string
  budget?: string
  spent?: string
}

const PROJECT_ALIASES: Record<keyof Omit<ProjectKeys, 'statusKind'>, readonly string[]> = {
  title: ['Project', 'Name', 'Title'],
  status: ['Status', 'Status 1', 'Pipeline', 'State'],
  client: ['Client', 'Customer', 'Account', 'Company', 'Contact'],
  location: ['Location', 'Address', 'Job Address', 'Job Address (text)'],
  jobAccount: ['Job Account Setup', 'Job Account', 'Account Setup'],
  followUp: ['Need follow-up', 'Need Follow-up', 'Follow up', 'Follow-up', 'Follow Up'],
  budget: ['Budget'],
  spent: ['Spent', 'Budget spent'],
}

const projectKeyCache = new Map<string, ProjectKeys>()

async function getProjectKeys(dbId: string): Promise<ProjectKeys> {
  if (projectKeyCache.has(dbId)) return projectKeyCache.get(dbId)!
  const db: any = await notion.databases.retrieve({ database_id: dbId })
  const props: Record<string, any> = db.properties || {}

  const pick = (cands: readonly string[], accept?: (t: string) => boolean) => {
    for (const name of cands) {
      const p = props[name]
      if (!p) continue
      if (!accept || accept(p.type)) return name
    }
    return undefined
  }

  const title = pick(PROJECT_ALIASES.title, t => t === 'title')
  const statusName = pick(PROJECT_ALIASES.status, t => t === 'status' || t === 'select')
  const client = pick(PROJECT_ALIASES.client)
  const location = pick(PROJECT_ALIASES.location)
  const jobAccount = pick(PROJECT_ALIASES.jobAccount, t => t === 'checkbox')
  const followUp = pick(PROJECT_ALIASES.followUp, t => t === 'checkbox' || t === 'select' || t === 'status')
  const budget = pick(PROJECT_ALIASES.budget, t => t === 'number')
  const spent = pick(PROJECT_ALIASES.spent, t => t === 'number')

  const statusKind: 'status' | 'select' | undefined =
    statusName && props[statusName]?.type === 'status' ? 'status' : statusName ? 'select' : undefined

  const keys: ProjectKeys = {
    title: title || Object.keys(props).find(k => props[k]?.type === 'title')!,
    status: statusName,
    statusKind,
    client,
    location,
    jobAccount,
    followUp,
    budget,
    spent,
  }

  projectKeyCache.set(dbId, keys)
  return keys
}

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
  return undefined
}

function readNumber(p: any, key?: string): number | undefined {
  if (!key) return undefined
  const prop = p[key]
  if (!prop) return undefined
  if (prop.type === 'number') return prop.number ?? undefined
  return undefined
}

function selectFilter(property: string, kind: 'status' | 'select', equals: string): any {
  return { property, [kind]: { equals } } as any
}

/** ----------------------
 *  Public API (used by routes)
 *  ---------------------- */

/** Dashboard KPI: count of "Post & Beam" projects */
export async function countPostAndBeam(): Promise<number> {
  if (!PROJECTS_DB_ID) return 0
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  if (!keys.status || !keys.statusKind) return 0
  let cursor: string | undefined
  let total = 0
  const MATCHES = ['Post & Beam', 'Post & Beam(s)', 'Post & Beam Posts', 'Post & Beam / Posts & Beams']

  do {
    const { results, next_cursor, has_more }: any = await notion.databases.query({
      database_id: PROJECTS_DB_ID,
      filter: { or: MATCHES.map(m => selectFilter(keys.status!, keys.statusKind!, m)) } as any,
      page_size: 50,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    total += results.length
    cursor = has_more ? next_cursor : undefined
  } while (cursor)

  return total
}

/** Active bids & follow-ups list (lightweight) */
export async function listBids(): Promise<Array<{ id: string; title: string; client?: string; location?: string; status?: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)

  // heuristics: status in common "bid" states OR followUp checked
  const BID_STATUSES = ['Bid', 'Bidding', 'Active Bid', 'Estimating', 'Estimate', 'Proposal', 'Quote', 'Follow Up']

  const filters: any[] = []
  if (keys.status && keys.statusKind) {
    filters.push(...BID_STATUSES.map(s => selectFilter(keys.status!, keys.statusKind!, s)))
  }
  if (keys.followUp) {
    // checkbox == true OR select/status equals some "follow" state
    filters.push(
      { property: keys.followUp, checkbox: { equals: true } } as any,
      ...(keys.followUp && (keys.followUp in (await notion.databases.retrieve({ database_id: PROJECTS_DB_ID }) as any).properties)
        ? [
            { property: keys.followUp, select: { equals: 'Follow Up' } } as any,
            { property: keys.followUp, status: { equals: 'Follow Up' } } as any,
          ]
        : [])
    )
  }

  const filter = filters.length ? { or: filters } : undefined
  const { results }: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 50,
  })

  return results.map((r: any) => {
    const p = r.properties || {}
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      client: readTextish(p, keys.client),
      location: readTextish(p, keys.location),
      status: keys.status
        ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
        : undefined,
    }
  })
}

/** Projects missing Job Account Setup (checkbox false) */
export async function listJobAccountPending(): Promise<
  Array<{ id: string; title: string; client?: string; location?: string; status?: string }>
> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const filter: any = keys.jobAccount
    ? { property: keys.jobAccount, checkbox: { equals: false } }
    : undefined

  const { results }: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 100,
  })

  return results.map((r: any) => {
    const p = r.properties || {}
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      client: readTextish(p, keys.client),
      location: readTextish(p, keys.location),
      status: keys.status
        ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
        : undefined,
    }
  })
}

/** Toggle Job Account Setup checkbox */
export async function toggleJobAccount(id: string, value: boolean): Promise<void> {
  if (!PROJECTS_DB_ID) return
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  if (!keys.jobAccount) return
  await notion.pages.update({
    page_id: id,
    properties: { [keys.jobAccount]: { checkbox: value } } as any,
  })
}

/** Improvements (problems/upgrades) — list */
export async function listImprovements(openOnly = false): Promise<Array<{ id: string; title: string; status?: string; projectId?: string }>> {
  if (!IMPROVEMENTS_DB_ID) return []
  const db: any = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = db.properties || {}

  const titleKey = Object.keys(props).find(k => props[k]?.type === 'title') || 'Title'
  const statusKey = Object.keys(props).find(k => props[k]?.type === 'status' || props[k]?.type === 'select')
  const statusKind: 'status' | 'select' | undefined =
    statusKey && props[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
  const projectRel = Object.keys(props).find(
    k => props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID
  )

  const filter: any =
    openOnly && statusKey && statusKind
      ? { and: [{ property: statusKey, [statusKind]: { does_not_equal: 'Done' } }] }
      : undefined

  const { results }: any = await notion.databases.query({
    database_id: IMPROVEMENTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 100,
  })

  return results.map((r: any) => {
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

/** Improvements — create new (upgrade/problem) */
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

/** Improvements — update status */
export async function updateImprovementStatus(id: string, status: string) {
  const db: any = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID })
  const props = db.properties || {}
  const statusKey = Object.keys(props).find(k => props[k]?.type === 'status' || props[k]?.type === 'select')
  const statusKind: 'status' | 'select' | undefined =
    statusKey && props[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
  if (!statusKey || !statusKind) return
  await notion.pages.update({
    page_id: id,
    properties: { [statusKey]: { [statusKind]: { name: status } } } as any,
  })
}

/** Lightweight list for <select> options (id + title) */
export async function listProjectOptions(): Promise<Array<{ id: string; title: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const { results }: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    page_size: 100,
  })
  return results.map((r: any) => ({ id: r.id, title: readTitle(r.properties || {}, keys.title) }))
}

