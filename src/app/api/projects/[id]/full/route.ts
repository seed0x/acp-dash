import { NextResponse } from 'next/server'
import { getProjectFull } from '@/lib/notion-dashboard'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await getProjectFull(params.id)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 400 })
  }
}
