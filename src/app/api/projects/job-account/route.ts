import { NextRequest, NextResponse } from 'next/server'
import { listJobAccountPending, toggleJobAccount } from '@/lib/notion-dashboard'

export async function GET() {
  try {
    const rows = await listJobAccountPending()
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, value } = await req.json() as { id: string; value: boolean }
    if (!id) throw new Error('id required')
    await toggleJobAccount(id, !!value)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
