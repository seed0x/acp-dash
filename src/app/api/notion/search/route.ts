import { NextRequest, NextResponse } from 'next/server'
import { listItems } from '../../../../lib/notion'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const type = (searchParams.get('type') || 'All') as any
  try {
    const items = await listItems({ query: q, type })
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
