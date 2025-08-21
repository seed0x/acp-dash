// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion-dashboard';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { completed, status, assignee } = await req.json();
    
    if (!params.id) {
      return NextResponse.json({ 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    const properties: any = {};

    if (completed !== undefined) {
      // Map completed boolean to status
      properties['Status'] = { 
        status: { name: completed ? 'Done' : 'In progress' } 
      };
    } else if (status) {
      properties['Status'] = { 
        status: { name: status } 
      };
    }

    if (assignee !== undefined) {
      properties['Asignee'] = { // Note: keeping original Notion spelling
        rich_text: [{ text: { content: assignee } }]
      };
    }

    await notion.pages.update({
      page_id: params.id,
      properties
    } as any);

    return NextResponse.json({ 
      ok: true,
      message: 'Task updated successfully'
    });
  } catch (e: any) {
    console.error('Tasks PATCH error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to update task' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json({ 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    // Archive the task in Notion (soft delete)
    await notion.pages.update({
      page_id: params.id,
      archived: true
    } as any);

    return NextResponse.json({ 
      ok: true,
      message: 'Task deleted successfully'
    });
  } catch (e: any) {
    console.error('Tasks DELETE error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to delete task' 
    }, { status: 500 });
  }
}