// src/app/api/projects/board/route.ts
import { NextResponse } from 'next/server'
import { listProjectsBoard } from '@/lib/notion-dashboard'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || undefined
    const status = url.searchParams.get('status') || undefined

    const data = await listProjectsBoard({ q, status })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
