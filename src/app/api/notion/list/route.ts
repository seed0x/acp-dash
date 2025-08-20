import { NextRequest, NextResponse } from 'next/server'
import { listItems } from '../../../../lib/notion'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || undefined
  const type = (searchParams.get('type') || undefined) as any
  const stage = (searchParams.get('stage') || undefined) as any

  try {
    const items = await listItems({ query, type, stage })
    return withCors(NextResponse.json({ items }))
  } catch (e: any) {
    return withCors(NextResponse.json({ error: e.message }, { status: 500 }))
  }
}

function withCors(res: NextResponse) {
  const origin = process.env.ALLOWED_ORIGINS || '*'
  res.headers.set('Access-Control-Allow-Origin', origin)
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return res
}

export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}
