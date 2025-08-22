// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { 
  notion, 
  PROJECTS_DB_ID, 
  IMPROVEMENTS_DB_ID, 
  PHOTOS_DB_ID, 
  TASKS_DB_ID, 
  CLIENTS_DB_ID,
  EXPENSES_DB_ID,
  checkNotionConnection
} from '@/lib/notion-dashboard'

export async function GET() {
  const report: any = {
    env: {
      NOTION_TOKEN: !!process.env.NOTION_TOKEN,
      NODE_ENV: process.env.NODE_ENV,
      nodeVersion: process.versions.node,
      timestamp: new Date().toISOString(),
      isCI: !!process.env.GITHUB_ACTIONS
    },
    notion: {
      available: false
    },
    databases: {},
    errors: [] as string[],
  }

  // Check if we're in CI environment (GitHub Actions only)
  if (process.env.GITHUB_ACTIONS) {
    report.errors.push('Running in CI environment - Notion connection skipped');
    return NextResponse.json(report, { status: 200 });
  }

  // Check Notion connection
  try {
    const isConnected = await checkNotionConnection();
    report.notion.available = isConnected;
    
    if (!isConnected) {
      report.errors.push('Notion API unavailable');
      return NextResponse.json(report, { status: 500 });
    }

    // If connection works, try to get user info
    const me = await notion.users.me({})
    report.notion.me = { type: (me as any).type }
  } catch (e: any) {
    report.errors.push(`Notion connection failed: ${e?.message || e}`)
  }

  // Test database access only if Notion is available
  if (report.notion.available) {
    const databases = [
      ['projects', PROJECTS_DB_ID],
      ['improvements', IMPROVEMENTS_DB_ID],
      ['photos', PHOTOS_DB_ID],
      ['tasks', TASKS_DB_ID],
      ['clients', CLIENTS_DB_ID],
      ['expenses', EXPENSES_DB_ID],
    ] as const;

    for (const [label, id] of databases) {
      if (!id) { 
        report.errors.push(`${label} DB ID is missing`); 
        continue; 
      }
      
      try {
        const db = await notion.databases.retrieve({ database_id: id })
        report.databases[label] = {
          id, 
          title: (db as any)?.title?.[0]?.plain_text ?? '(untitled)',
          props: Object.keys((db as any)?.properties || {}),
          propCount: Object.keys((db as any)?.properties || {}).length
        }
      } catch (e: any) {
        report.errors.push(`${label} retrieve failed (${id}): ${e?.message || e}`)
      }
    }
  }

  const status = report.errors.length ? 500 : 200
  return NextResponse.json(report, { status })
}