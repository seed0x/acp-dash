// src/app/api/improvements/route.ts
import { NextResponse } from 'next/server'
import {
  listImprovements,
  createImprovement,
  updateImprovementStatus,
} from '@/lib/notion-dashboard'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const openOnly = searchParams.get('openOnly') === 'true'
    const rows = await listImprovements(openOnly)
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body?.title || typeof body.title !== 'string' || !body.projectId) {
      return NextResponse.json({ error: 'projectId and title are required' }, { status: 400 })
    }
    await createImprovement({
      projectId: body.projectId,
      title: body.title,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

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
