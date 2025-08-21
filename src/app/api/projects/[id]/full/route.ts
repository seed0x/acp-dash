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

    // This will now return project data with comments, tasks, issues, photos, etc.
    const data = await getProjectFull(params.id)
    
    // Ensure all arrays exist even if empty
    const fullData = {
      ...data,
      comments: data.comments || [],
      tasks: data.tasks || [],
      issues: data.issues || [],
      photos: data.photos || [],
      expenses: data.expenses || []
    }
    
    return NextResponse.json(fullData)
  } catch (e: any) {
    console.error('Project full API error:', e);
    return NextResponse.json({ 
      error: e?.message || 'Failed to fetch project details',
      // Return empty structure on error so UI doesn't break
      project: {},
      comments: [],
      tasks: [],
      issues: [],
      photos: [],
      expenses: []
    }, { status: 500 })
  }
}