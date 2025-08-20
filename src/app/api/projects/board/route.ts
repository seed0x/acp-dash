import { NextResponse } from 'next/server'
import { listProjects } from '@/lib/notion-dashboard'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || undefined
  const status = searchParams.get('status') || undefined

  try {
    const { items, statusOptions } = await listProjects({ q, status })
    return NextResponse.json({ items, statusOptions })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 400 })
  }
}
