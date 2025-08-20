// src/app/api/projects/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { listProjects } from '@/lib/notion-projects'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const status = searchParams.get('status') || undefined
    const data = await listProjects({ q, status })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
