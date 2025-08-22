// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import { notion, TASKS_DB_ID, listImprovements } from '@/lib/notion-dashboard';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const openOnly = searchParams.get('openOnly') === 'true';
    
    // Use the existing listImprovements function which works with tasks
    const tasks = await listImprovements(openOnly);
    
    return NextResponse.json({ 
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        description: task.description,
        projectName: task.projectName,
        completed: task.status === 'Done' || task.status === 'Complete'
      }))
    });
  } catch (e: any) {
    console.error('Tasks GET error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch tasks',
      tasks: []
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { projectId, title, assignee, dueDate, category } = await req.json();
    
    if (!projectId || !title) {
      return NextResponse.json({ 
        error: 'Project ID and title are required' 
      }, { status: 400 });
    }

    const properties: any = {
      'Task': { 
        title: [{ text: { content: title } }] 
      },
      'Projects': { 
        relation: [{ id: projectId }] 
      },
      'Status': { 
        status: { name: 'Not started' } 
      }
    };

    // Add optional fields if provided
    if (assignee) {
      properties['Asignee'] = { // Note: keeping original Notion spelling
        rich_text: [{ text: { content: assignee } }]
      };
    }
    
    if (dueDate) {
      properties['Due Date'] = {
        date: { start: dueDate }
      };
    }
    
    if (category) {
      properties['Category'] = {
        select: { name: category }
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: TASKS_DB_ID },
      properties
    } as any);

    return NextResponse.json({ 
      ok: true,
      id: (response as any).id,
      message: 'Task created successfully'
    });
  } catch (e: any) {
    console.error('Tasks POST error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to create task' 
    }, { status: 500 });
  }
}

// src/app/api/tasks/[id]/route.ts
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
      properties['Asignee'] = {
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