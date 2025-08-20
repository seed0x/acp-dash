import { NextResponse } from 'next/server'
import { listBids } from '@/lib/notion-dashboard'

export async function GET() {
  try {
    const rows = await listBids()
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
