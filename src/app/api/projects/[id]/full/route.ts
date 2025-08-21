// src/app/api/projects/[id]/full/route.ts
import { NextResponse } from 'next/server'
import { getProjectFull } from '@/lib/notion-dashboard'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    const data = await getProjectFull(params.id)
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Project full API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch project details' 
    }, { status: 500 })
  }
}