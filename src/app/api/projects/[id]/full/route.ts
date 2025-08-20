// src/app/api/projects/[id]/full/route.ts
import { NextResponse } from 'next/server'
import { getProjectFull } from '@/lib/notion-dashboard'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await getProjectFull(params.id)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
