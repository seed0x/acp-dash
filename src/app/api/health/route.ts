import { NextResponse } from 'next/server'
import { notion, PROJECTS_DB_ID, IMPROVEMENTS_DB_ID } from '@/lib/notion-dashboard'

export async function GET() {
  const report: any = {
    env: {
      NOTION_TOKEN: !!process.env.NOTION_TOKEN,
      NOTION_PROJECTS_DB_ID: !!PROJECTS_DB_ID,
      NOTION_IMPROVEMENTS_DB_ID: !!IMPROVEMENTS_DB_ID,
      nodeVersion: process.versions.node,
    },
    notion: {},
    errors: [] as string[],
  }

  try {
    const me = await notion.users.me({})
    report.notion.me = { type: (me as any).type }
  } catch (e: any) {
    report.errors.push(`notion.users.me failed: ${e?.message || e}`)
  }

  for (const [label, id] of [
    ['projects', PROJECTS_DB_ID],
    ['improvements', IMPROVEMENTS_DB_ID],
  ] as const) {
    if (!id) { report.errors.push(`${label} DB id is missing`); continue }
    try {
      const db = await notion.databases.retrieve({ database_id: id })
      report.notion[label] = {
        id, title: (db as any)?.title?.[0]?.plain_text ?? '(untitled)',
        props: Object.keys((db as any)?.properties || {}),
      }
    } catch (e: any) {
      report.errors.push(`${label} retrieve failed (${id}): ${e?.message || e}`)
    }
  }

  const status = report.errors.length ? 500 : 200
  return NextResponse.json(report, { status })
}
