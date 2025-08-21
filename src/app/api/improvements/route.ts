// src/app/api/improvements/route.ts
import { NextResponse } from 'next/server'
import {
  listImprovements,
  listTasks,
  createImprovement,
  createTask,
  updateImprovementStatus,
  updateTask,
  getTaskDetails,
  bulkUpdateTaskStatus,
} from '@/lib/notion-dashboard'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const openOnly = searchParams.get('openOnly') === 'true'
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status')?.split(',').filter(Boolean) || undefined
    const priority = searchParams.get('priority')?.split(',').filter(Boolean) || undefined
    const assignee = searchParams.get('assignee') || undefined
    const projectId = searchParams.get('projectId') || undefined
    const enhanced = searchParams.get('enhanced') === 'true'

    // Use enhanced task listing if requested, otherwise use original
    if (enhanced) {
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

    // Use enhanced task creation if additional fields are provided
    if (body.description || body.priority || body.assignee || body.dueDate) {
      const taskId = await createTask({
        projectId: body.projectId,
        title: body.title,
        description: body.description,
        priority: body.priority,
        assignee: body.assignee,
        dueDate: body.dueDate,
        status: body.status
      })
      return NextResponse.json({ ok: true, taskId })
    } else {
      // Use original improvement creation for backwards compatibility
      await createImprovement({
        projectId: body.projectId,
        title: body.title,
        priority: body.priority,
      })
      return NextResponse.json({ ok: true })
    }
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
    
    if (!body?.id) {
      return NextResponse.json({ 
        error: 'id is required' 
      }, { status: 400 })
    }

    // Handle bulk operations
    if (body.bulk && Array.isArray(body.taskIds)) {
      if (!body.status) {
        return NextResponse.json({ 
          error: 'status is required for bulk operations' 
        }, { status: 400 })
      }
      await bulkUpdateTaskStatus(body.taskIds, body.status)
      return NextResponse.json({ ok: true })
    }

    // Handle enhanced task updates
    if (body.title || body.description !== undefined || body.priority !== undefined || 
        body.assignee !== undefined || body.dueDate !== undefined) {
      await updateTask(body.id, {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        assignee: body.assignee,
        dueDate: body.dueDate
      })
      return NextResponse.json({ ok: true })
    }

    // Handle simple status update (backwards compatibility)
    if (body.status) {
      await updateImprovementStatus(body.id, body.status)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ 
      error: 'No valid update fields provided' 
    }, { status: 400 })
  } catch (e: any) {
    console.error('Improvements PATCH API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to update improvement' 
    }, { status: 500 })
  }
}