// src/app/api/projects/job-account/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { listJobAccountPending, toggleJobAccount } from '@/lib/notion-dashboard'

export async function GET() {
  try {
    const rows = await listJobAccountPending()
    return NextResponse.json({ rows })
  } catch (e: any) {
    console.error('Job account GET API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch pending job accounts',
      rows: []
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, value } = await req.json() as { id: string; value: boolean }
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }
    
    await toggleJobAccount(id, !!value)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Job account PATCH API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to update job account status' 
    }, { status: 500 })
  }
}
