// src/lib/notion.ts
import { Client } from '@notionhq/client'

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export const DB_IDS = (process.env.NOTION_DB_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export type Stage = 'Post & Beam' | 'Top Out' | 'Trim' | 'Ready to Invoice'
export type ItemType = 'Bid' | 'Invoice' | 'Job'

export type Item = {
  id: string
  dbId: string
  title: string
  stage?: Stage
  type?: ItemType
  customer?: string
  address?: string
  amount?: number | null
  due?: string | null
  bidNo?: number | null
  invoiceNo?: number | null
  notionUrl?: string
}

// ---------- Flexible property resolution ----------
const ALIASES = {
  title:     ['Name', 'Title'],
  stage:     ['Stage', 'Status', 'Pipeline', 'State'],
  type:      ['Type', 'Item Type', 'Record Type'],
  customer:  ['Customer', 'Client', 'Account', 'Company', 'Contact'],
  address:   ['Address', 'Job Address', 'Location'],
  amount:    ['Amount', 'Value', 'Total', 'Price'],
  due:       ['Due', 'Due Date', 'Target Date', 'Date'],
  bidNo:     ['Bid #', 'Bid Number'],
  invoiceNo: ['Invoice #', 'Invoice Number'],
} as const

type PropKeys = Partial<Record<keyof typeof ALIASES, string>> & { title: string }

function pickProp(props: Record<string, any>, candidates: string[]) {
  for (const k of candidates) if (props[k]) return k
}

const schemaCache = new Map<string, PropKeys>()

async function getPropKeys(dbId: string): Promise<PropKeys> {
  if (schemaCache.has(dbId)) return schemaCache.get(dbId)!
  const db = await notion.databases.retrieve({ database_id: dbId })
  const props = (db as any).properties as Record<string, any>
  const keys: any = {}
  for (const [logical, cands] of Object.entries(ALIASES)) {
    const key = pickProp(props, cands as string[])
    if (key) keys[logical] = key
  }
  if (!keys.title) throw new Error(`No title property found on DB ${dbId}`)
  schemaCache.set(dbId, keys as PropKeys)
  return keys as PropKeys
}

// ---------- Mapping ----------
const getPlain = (rt: any) => rt?.[0]?.plain_text

export function mapPageToItem(dbId: string, page: any, keys: PropKeys): Item {
  const p = page.properties
  const title = p[keys.title!]?.title?.[0]?.plain_text ?? 'Untitled'
  const stage = keys.stage ? p[keys.stage]?.select?.name as Stage : undefined
  const type  = keys.type  ? p[keys.type ]?.select?.name as ItemType : undefined
  const customer = keys.customer ? getPlain(p[keys.customer]?.rich_text) : undefined
  const address  = keys.address  ? getPlain(p[keys.address ]?.rich_text) : undefined
  const amount   = keys.amount   ? (p[keys.amount]?.number ?? null) : null
  const due      = keys.due      ? (p[keys.due   ]?.date?.start ?? null) : null
  const bidNo    = keys.bidNo    ? (p[keys.bidNo ]?.number ?? null) : null
  const invoiceNo= keys.invoiceNo? (p[keys.invoiceNo]?.number ?? null) : null

  return {
    id: page.id,
    dbId,
    title,
    stage,
    type,
    customer,
    address,
    amount,
    due,
    bidNo,
    invoiceNo,
    notionUrl: page.url
  }
}

// ---------- Queries ----------
export async function listItems(params: { query?: string; type?: ItemType | 'All'; stage?: Stage }) {
  const { query, type, stage } = params
  const results: Item[] = []

  for (const dbId of DB_IDS) {
    const keys = await getPropKeys(dbId)

    // Build filters using *resolved* property names
    const and: any[] = []

    if (type && type !== 'All' && keys.type) {
      and.push({ property: keys.type, select: { equals: type } })
    }
    if (stage && keys.stage) {
      and.push({ property: keys.stage, select: { equals: stage } })
    }
    if (query && query.trim()) {
      const q = query.trim()
      const or: any[] = []
      if (keys.title)    or.push({ property: keys.title,    title: { contains: q } })
      if (keys.customer) or.push({ property: keys.customer, rich_text: { contains: q } })
      if (keys.address)  or.push({ property: keys.address,  rich_text: { contains: q } })
      const num = Number(q)
      if (!Number.isNaN(num)) {
        if (keys.amount)    or.push({ property: keys.amount,    number: { equals: num } })
        if (keys.bidNo)     or.push({ property: keys.bidNo,     number: { equals: num } })
        if (keys.invoiceNo) or.push({ property: keys.invoiceNo, number: { equals: num } })
      }
      if (or.length) and.push({ or })
    }

    const filter = and.length ? { and } : undefined
    const sorts = keys.due ? [{ property: keys.due, direction: 'ascending' as const }] : undefined

    const pages = await notion.databases.query({ database_id: dbId, ...(filter && { filter }), ...(sorts && { sorts }) })
    for (const page of pages.results) {
      if (page.object === 'page') results.push(mapPageToItem(dbId, page, keys))
    }
  }
  return results
}

// ---------- Updates (uses page -> parent DB to find the right property name) ----------
export async function updateStage(pageId: string, newStage: Stage) {
  const page = await notion.pages.retrieve({ page_id: pageId })
  const parent = (page as any).parent
  if (!parent || parent.type !== 'database_id') throw new Error('Page parent is not a database')
  const dbId: string = parent.database_id
  const keys = await getPropKeys(dbId)
  if (!keys.stage) throw new Error('This database has no Stage/Status property')
  await notion.pages.update({
    page_id: pageId,
    properties: { [keys.stage]: { select: { name: newStage } } },
  })
}
