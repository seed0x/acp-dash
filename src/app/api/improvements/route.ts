// src/app/api/improvements/route.ts
import { NextResponse } from 'next/server'
import {
  listImprovements,
  createImprovement,
  updateImprovementStatus,
} from '@/lib/notion-dashboard'

// GET /api/improvements?openOnly=true&projectId=<id>
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const openOnly = url.searchParams.get('openOnly') === 'true'

    // library expects a boolean, not an object
    let rows = await listImprovements(openOnly)

    // optional filtering client-side by project
    if (projectId) rows = rows.filter(r => r.projectId === projectId)

    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/improvements
// body: { projectId?: string, title: string, action?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body?.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    await createImprovement({
      projectId: body.projectId,
      title: body.title,
      action: body.action,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// PATCH /api/improvements
// body: { id: string, status: string }
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    if (!body?.id || !body?.status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }
    await updateImprovementStatus(body.id, body.status)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
