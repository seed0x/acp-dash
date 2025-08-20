import { NextResponse } from 'next/server'
import { notion, DB_IDS } from '../../../../lib/notion'

export async function GET() {
  const out: any = {
    hasToken: !!process.env.NOTION_TOKEN,
    dbIds: DB_IDS,
    databases: [] as any[],
    ok: true,
  }

  try {
    // ✅ Notion SDK requires an empty object here
    const me = await notion.users.me({})
    out.me = { type: (me as any).type }

    for (const id of DB_IDS) {
      try {
        const db = await notion.databases.retrieve({ database_id: id })
        out.databases.push({
          id,
          title: (db as any).title?.[0]?.plain_text ?? '(untitled)',
          props: Object.keys((db as any).properties || {}),
        })
      } catch (e: any) {
        out.databases.push({ id, error: e.message })
      }
    }
  } catch (e: any) {
    out.ok = false
    out.error = e.message
  }

  return NextResponse.json(out)
}
