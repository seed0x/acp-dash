// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

/** -------------------------------
 *  Notion client + DB ID helpers
 *  ------------------------------- */
export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

const env = (k: string) => process.env[k]

export const PROJECTS_DB_ID =
  env('NEXT_PUBLIC_NOTION_PROJECTS_DB_ID') || env('NOTION_PROJECTS_DB_ID') || env('PROJECTS_DB_ID') || ''

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
 *  Flexible schema (Projects)
 *  ------------------------------- */
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
  deadline?: string
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
  deadline: ['Deadline', 'Due', 'Due Date'],
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
  const followUp = pick(PROJECT_ALIASES.followUp, t => ['checkbox', 'select', 'status'].includes(t))
  const budget = pick(PROJECT_ALIASES.budget, t => t === 'number')
  const spent = pick(PROJECT_ALIASES.spent, t => t === 'number')
  const deadline = pick(PROJECT_ALIASES.deadline, t => t === 'date')

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
    deadline,
  }

  projectKeyCache.set(dbId, keys)
  return keys
}

/** -------------------------------
 *  Property readers
 *  ------------------------------- */
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
 *  Public dashboard functions
 *  ------------------------------- */

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
  const res: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 50,
  })

  return res.results.map((r: any) => {
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

/** 3) Projects missing Job Account Setup checkbox */
export async function listJobAccountPending(): Promise<Array<{ id: string; title: string; client?: string; location?: string; status?: string }>> {
  if (!PROJECTS_DB_ID) return []
  const keys = await getProjectKeys(PROJECTS_DB_ID)
  const filter: any = keys.jobAccount ? { property: keys.jobAccount, checkbox: { equals: false } } : undefined

  const res: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 100,
  })

  return res.results.map((r: any) => {
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

  // status options
  let statusOptions: string[] = []
  if (keys.status && keys.statusKind) {
    const optArr =
      keys.statusKind === 'status'
        ? props[keys.status]?.status?.options
        : props[keys.status]?.select?.options
    statusOptions = Array.isArray(optArr) ? optArr.map((o: any) => o.name).filter(Boolean) : []
  }

  // filters
  const andFilters: any[] = []
  const orFilters: any[] = []

  const q = (input.q || '').trim()
  if (q) {
    orFilters.push(
      { property: keys.title, title: { contains: q } } as any,
      ...(keys.client ? [{ property: keys.client, rich_text: { contains: q } } as any] : []),
      ...(keys.location ? [{ property: keys.location, rich_text: { contains: q } } as any] : []),
    )
  }
  if (input.status && input.status !== 'All' && keys.status && keys.statusKind) {
    andFilters.push(selectFilter(keys.status, keys.statusKind, input.status))
  }

  let filter: any = undefined
  if (andFilters.length && orFilters.length) {
    filter = { and: [...andFilters, { or: orFilters }] }
  } else if (andFilters.length) {
    filter = { and: andFilters }
  } else if (orFilters.length) {
    filter = { or: orFilters }
  }

  const res: any = await notion.databases.query({
    database_id: PROJECTS_DB_ID,
    ...(filter ? { filter } : {}),
    page_size: 100,
  })

  const items = res.results.map((r: any) => {
    const p = r.properties || {}
    return {
      id: r.id,
      title: readTitle(p, keys.title),
      status: keys.status
        ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
        : undefined,
      client: readTextish(p, keys.client),
      location: readTextish(p, keys.location),
    }
  })

  return { items, statusOptions }
}

/** 10) Full project detail with totals */
export async function getProjectFull(id: string): Promise<{
  project: {
    id: string
    title: string
    client?: string
    location?: string
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

  // Base project
  const page: any = await notion.pages.retrieve({ page_id: id })
  const p = page.properties || {}
  const proj = {
    id,
    title: readTitle(p, keys.title),
    client: readTextish(p, keys.client),
    location: readTextish(p, keys.location),
    status: keys.status
      ? (keys.statusKind === 'status' ? p[keys.status]?.status?.name : p[keys.status]?.select?.name)
      : undefined,
    jobAccount: readCheckbox(p, keys.jobAccount),
    followUp: keys.followUp
      ? (p[keys.followUp]?.type === 'checkbox'
          ? !!p[keys.followUp]?.checkbox
          : readTextish(p, keys.followUp))
      : undefined,
    budget: readNumber(p, keys.budget),
    spent: readNumber(p, keys.spent),
    deadline: readTextish(p, keys.deadline),
  }

  // Helper to pull related rows by relation to PROJECTS_DB_ID
  async function listRelated(dbId?: string) {
    if (!dbId) return []
    const db: any = await notion.databases.retrieve({ database_id: dbId })
    const props = db.properties || {}
    const relKey = Object.keys(props).find(
      k => props[k]?.type === 'relation' && props[k]?.relation?.database_id === PROJECTS_DB_ID
    )
    if (!relKey) return []
    return await queryAll({
      database_id: dbId,
      filter: { property: relKey, relation: { contains: id } } as any,
      page_size: 100,
    })
  }

  // Improvements
  const impRows = await listRelated(IMPROVEMENTS_DB_ID)
  let improvements = impRows.map((r: any) => {
    const pr = r.properties || {}
    const titleKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const statusKey = Object.keys(pr).find(k => ['status', 'select'].includes(pr[k]?.type))
    const statusKind: 'status' | 'select' | undefined =
      statusKey && pr[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
    return {
      id: r.id,
      title: readTitle(pr, titleKey),
      status: statusKey ? (statusKind === 'status' ? pr[statusKey]?.status?.name : pr[statusKey]?.select?.name) : undefined,
    }
  })

  // Tasks
  const taskRows = await listRelated(TASKS_DB_ID)
  const tasks = taskRows.map((r: any) => {
    const pr = r.properties || {}
    const titleKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const statusKey = Object.keys(pr).find(k => ['status', 'select'].includes(pr[k]?.type))
    const statusKind: 'status' | 'select' | undefined =
      statusKey && pr[statusKey]?.type === 'status' ? 'status' : statusKey ? 'select' : undefined
    const assigneeKey = Object.keys(pr).find(k => pr[k]?.type === 'people')
    const dueKey = Object.keys(pr).find(k => pr[k]?.type === 'date' || /due/i.test(k))
    const assignee =
      assigneeKey && pr[assigneeKey]?.people?.[0]?.name
        ? pr[assigneeKey].people[0].name
        : assigneeKey && pr[assigneeKey]?.people?.[0]?.person?.email
    return {
      id: r.id,
      title: readTitle(pr, titleKey),
      status: statusKey ? (statusKind === 'status' ? pr[statusKey]?.status?.name : pr[statusKey]?.select?.name) : undefined,
      assignee,
      due: dueKey ? pr[dueKey]?.date?.start : undefined,
    }
  })

  // Expenses
  const expRows = await listRelated(EXPENSES_DB_ID)
  const expenses = expRows.map((r: any) => {
    const pr = r.properties || {}
    const nameKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const catKey = Object.keys(pr).find(k => pr[k]?.type === 'select')
    const valKey = Object.keys(pr).find(k => pr[k]?.type === 'number')
    return {
      id: r.id,
      name: readTitle(pr, nameKey),
      category: catKey ? pr[catKey]?.select?.name : undefined,
      value: valKey ? pr[valKey]?.number : undefined,
    }
  })

  // Time entries
  const timeRows = await listRelated(TIME_DB_ID)
  const time = timeRows.map((r: any) => {
    const pr = r.properties || {}
    const nameKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const personKey = Object.keys(pr).find(k => pr[k]?.type === 'people')
    const dateKey = Object.keys(pr).find(k => pr[k]?.type === 'date')
    const hoursKey = Object.keys(pr).find(k => pr[k]?.type === 'number')
    return {
      id: r.id,
      name: readTitle(pr, nameKey),
      person:
        personKey && pr[personKey]?.people?.[0]?.name
          ? pr[personKey].people[0].name
          : personKey && pr[personKey]?.people?.[0]?.person?.email,
      date: dateKey ? pr[dateKey]?.date?.start : undefined,
      hours: hoursKey ? pr[hoursKey]?.number : undefined,
    }
  })

  // Notes
  const noteRows = await listRelated(NOTES_DB_ID)
  const notes = noteRows.map((r: any) => {
    const pr = r.properties || {}
    const titleKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const createdKey = Object.keys(pr).find(k => pr[k]?.type === 'created_time')
    return {
      id: r.id,
      title: readTitle(pr, titleKey),
      created: createdKey ? pr[createdKey]?.created_time : undefined,
    }
  })

  // Docs
  const docRows = await listRelated(DOCS_DB_ID)
  const docs = docRows.map((r: any) => {
    const pr = r.properties || {}
    const titleKey = Object.keys(pr).find(k => pr[k]?.type === 'title')!
    const descKey = Object.keys(pr).find(k => pr[k]?.type === 'rich_text' || /description/i.test(k))
    return {
      id: r.id,
      title: readTitle(pr, titleKey),
      description: descKey ? readTextish(pr, descKey) : undefined,
    }
  })

  // Totals
  const totalExpenses = expenses.reduce((s, e) => s + (e.value || 0), 0)
  const totalHours = time.reduce((s, t) => s + (t.hours || 0), 0)
  const openTasks = tasks.filter(t => (t.status || '').toLowerCase() !== 'done').length
  const openImprovements = improvements.filter(i => (i.status || '').toLowerCase() !== 'done').length

  return {
    project: { ...proj, totalExpenses, totalHours, openTasks, openImprovements },
    improvements,
    tasks,
    expenses,
    time,
    notes,
    docs,
  }
}

