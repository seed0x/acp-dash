import { NextRequest, NextResponse } from 'next/server'
import { updateStage } from '../../../../lib/notion'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, stage } = body as { id: string; stage: any }
    if (!id || !stage) throw new Error('id and stage required')
    await updateStage(id, stage)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
