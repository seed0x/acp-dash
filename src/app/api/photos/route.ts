// src/app/api/photos/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createPhotoEntry } from '@/lib/notion-dashboard';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string;
    const description = formData.get('description') as string;

    console.log('Photo upload request:', { 
      hasFile: !!file, 
      projectId, 
      description,
      fileName: file?.name 
    });

    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided' 
      }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    // Upload file to Vercel Blob storage
    console.log('Uploading to Vercel Blob...');
    const blob = await put(file.name, file, {
      access: 'public',
    });
    console.log('Blob upload successful:', blob.url);

    // Create an entry in the Notion Photos database
    console.log('Creating Notion photo entry...');
    await createPhotoEntry({
      projectId,
      description: description || file.name,
      photoUrl: blob.url,
    });

    console.log('Photo entry created successfully');

    return NextResponse.json({ 
      ok: true, 
      url: blob.url,
      message: 'Photo uploaded successfully'
    });

  } catch (e: any) {
    console.error('Photo upload error:', e);
    
    return NextResponse.json({ 
      error: e?.message || 'Failed to upload photo'
    }, { status: 500 });
  }
}