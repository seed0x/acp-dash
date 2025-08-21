// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { getTaskDetails } from '@/lib/notion-dashboard'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const task = await getTaskDetails(params.id)
    
    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ task })
  } catch (e: any) {
    console.error('Task detail GET API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch task details' 
    }, { status: 500 })
  }
}