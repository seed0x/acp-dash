// src/app/api/improvements/route.ts
import { NextResponse } from 'next/server'
import {
  listImprovements,
  createImprovement,
  updateImprovementStatus,
} from '@/lib/notion-dashboard'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const openOnly = searchParams.get('openOnly') === 'true'
    const enhanced = searchParams.get('enhanced') === 'true'
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status')?.split(',').filter(Boolean) || undefined
    const priority = searchParams.get('priority')?.split(',').filter(Boolean) || undefined
    const assignee = searchParams.get('assignee') || undefined
    const projectId = searchParams.get('projectId') || undefined
    
    if (enhanced) {
      // Use the listTasks function for enhanced data
      const { listTasks } = await import('@/lib/notion-dashboard')
      const rows = await listTasks({
        openOnly,
        search,
        status,
        priority,
        assignee,
        projectId
      })
      return NextResponse.json({ rows })
    } else {
      // Use the original listImprovements function
      const rows = await listImprovements(openOnly)
      return NextResponse.json({ rows })
    }
  } catch (e: any) {
    console.error('Improvements GET API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch improvements',
      rows: []
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    if (!body?.title || typeof body.title !== 'string' || !body.projectId) {
      return NextResponse.json({ 
        error: 'projectId and title are required' 
      }, { status: 400 })
    }
    
    await createImprovement({
      projectId: body.projectId,
      title: body.title,
      priority: body.priority
    })
    
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Improvements POST API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to create improvement' 
    }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    
    if (!body?.id || !body?.status) {
      return NextResponse.json({ 
        error: 'id and status are required' 
      }, { status: 400 })
    }
    
    await updateImprovementStatus(body.id, body.status)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Improvements PATCH API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to update improvement status' 
    }, { status: 500 })
  }
}