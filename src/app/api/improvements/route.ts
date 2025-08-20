import { NextRequest, NextResponse } from 'next/server'
import { listImprovements, createImprovement, updateImprovementStatus } from '@/lib/notion-dashboard'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId') || undefined
    const openOnly = searchParams.get('openOnly') === 'true'
    const rows = await listImprovements({ projectId, openOnly })
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, title, action } = await req.json() as { projectId: string; title: string; action?: string }
    if (!projectId || !title) throw new Error('projectId and title required')
    const id = await createImprovement({ projectId, title, action })
    return NextResponse.json({ id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id: string; status: string }
    if (!id || !status) throw new Error('id and status required')
    await updateImprovementStatus(id, status)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
