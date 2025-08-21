// src/app/api/projects/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { notion } from '@/lib/notion-dashboard'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json()
    
    if (!params.id) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ 
        error: 'Status is required' 
      }, { status: 400 })
    }

    // Update the project status in Notion
    await notion.pages.update({
      page_id: params.id,
      properties: {
        'Status': { 
          status: { name: status } 
        }
      }
    } as any)

    return NextResponse.json({ 
      ok: true,
      message: 'Status updated successfully'
    })
  } catch (e: any) {
    console.error('Status update error:', e)
    return NextResponse.json({ 
      error: e?.message || 'Failed to update status' 
    }, { status: 500 })
  }
}