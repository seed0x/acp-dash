// src/app/api/projects/list/route.ts
import { NextResponse } from 'next/server'
import { listProjectOptions } from '@/lib/notion-dashboard'

export async function GET() {
  try {
    // This will now include subdivision data from the updated Notion library
    const rows = await listProjectOptions()
    return NextResponse.json({ rows })
  } catch (e: any) {
    console.error('Projects list API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch project list',
      rows: []
    }, { status: 500 })
  }
}