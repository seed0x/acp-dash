// src/app/api/tasks/[id]/comments/route.ts
import { NextResponse } from 'next/server'
import { getTaskComments, addTaskComment } from '@/lib/notion-dashboard'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await getTaskComments(params.id)
    return NextResponse.json({ comments })
  } catch (e: any) {
    console.error('Comments GET API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch comments',
      comments: []
    }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    
    if (!body?.content || typeof body.content !== 'string') {
      return NextResponse.json({ 
        error: 'content is required' 
      }, { status: 400 })
    }
    
    const author = body.author || 'Anonymous'
    const commentId = await addTaskComment(params.id, body.content, author)
    
    return NextResponse.json({ ok: true, commentId })
  } catch (e: any) {
    console.error('Comments POST API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to create comment' 
    }, { status: 500 })
  }
}