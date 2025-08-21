// src/app/api/comments/route.ts
import { NextResponse } from 'next/server';
import { notion, NOTES_DB_ID } from '@/lib/notion-dashboard';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    // Query comments/notes related to this project
    const results = await notion.databases.query({
      database_id: NOTES_DB_ID,
      filter: {
        property: 'Projects',
        relation: { contains: projectId }
      },
      sorts: [
        { property: 'Created time', direction: 'descending' }
      ]
    } as any);

    const comments = (results as any).results.map((note: any) => {
      const props = note.properties || {};
      return {
        id: note.id,
        text: props.Name?.title?.map((t: any) => t.plain_text).join('') || 
              props.Note?.rich_text?.map((t: any) => t.plain_text).join('') || '',
        author: props.Author?.created_by?.name || 
                props.CreatedBy?.people?.[0]?.name || 
                'Unknown',
        createdAt: note.created_time || props['Created time']?.created_time,
        projectId
      };
    });

    return NextResponse.json({ comments });
  } catch (e: any) {
    console.error('Comments GET error:', e);
    return NextResponse.json({ 
      error: 'Failed to fetch comments',
      comments: []
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { projectId, text } = await req.json();
    
    if (!projectId || !text) {
      return NextResponse.json({ 
        error: 'Project ID and text are required' 
      }, { status: 400 });
    }

    // Create a new note/comment in Notion
    const response = await notion.pages.create({
      parent: { database_id: NOTES_DB_ID },
      properties: {
        'Name': { 
          title: [{ text: { content: text } }] 
        },
        'Projects': { 
          relation: [{ id: projectId }] 
        },
        'Type': { 
          select: { name: 'Comment' } 
        },
        'Date': {
          date: { start: new Date().toISOString().split('T')[0] }
        }
      }
    } as any);

    return NextResponse.json({ 
      ok: true,
      id: (response as any).id,
      message: 'Comment added successfully'
    });
  } catch (e: any) {
    console.error('Comments POST error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to add comment' 
    }, { status: 500 });
  }
}