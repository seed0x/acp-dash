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
    
    // Get date from EXIF data if available, otherwise use today
    let photoDate = new Date().toISOString().split('T')[0];
    
    // Try to extract date from file metadata if it's an image
    if (file && file.type.startsWith('image/')) {
      // For now, we'll use the file's last modified date if available
      // In production, you'd want to use an EXIF library to get the actual photo taken date
      if (file.lastModified) {
        photoDate = new Date(file.lastModified).toISOString().split('T')[0];
      }
    }
    
    // Allow manual date override
    const manualDate = formData.get('date') as string;
    if (manualDate) {
      photoDate = manualDate;
    }

    console.log('Photo upload request:', { 
      hasFile: !!file, 
      projectId, 
      description,
      photoDate,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ 
        error: 'Only image files are allowed' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size must be less than 10MB' 
      }, { status: 400 });
    }

    // Upload file to Vercel Blob storage with metadata
    console.log('Uploading to Vercel Blob...');
    const blob = await put(
      `photos/${projectId}/${Date.now()}-${file.name}`, 
      file, 
      {
        access: 'public',
        addRandomSuffix: false,
        contentType: file.type,
      }
    );
    console.log('Blob upload successful:', blob.url);

    // Create an entry in the Notion Photos database with automatic date
    console.log('Creating Notion photo entry with date...');
    await createPhotoEntry({
      projectId,
      description: description || `Photo taken on ${photoDate}`,
      photoUrl: blob.url,
      date: photoDate
    });

    console.log('Photo entry created successfully with date:', photoDate);

    return NextResponse.json({ 
      ok: true, 
      url: blob.url,
      date: photoDate,
      message: `Photo uploaded successfully (dated: ${photoDate})`
    });

  } catch (e: any) {
    console.error('Photo upload error:', e);
    
    // Provide more specific error messages
    if (e.message?.includes('Blob')) {
      return NextResponse.json({ 
        error: 'Failed to upload photo to storage. Please try again.'
      }, { status: 500 });
    }
    
    if (e.message?.includes('Notion')) {
      return NextResponse.json({ 
        error: 'Photo uploaded but failed to create database entry. Please check Notion connection.'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: e?.message || 'Failed to upload photo'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve photos for a project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }
    
    // This would fetch photos from Notion
    // For now, returning mock data
    const photos = [
      {
        id: '1',
        url: '/api/placeholder/400/300',
        description: 'Foundation work',
        date: '2024-01-15'
      },
      {
        id: '2',
        url: '/api/placeholder/400/300',
        description: 'Plumbing rough-in',
        date: '2024-01-20'
      }
    ];
    
    return NextResponse.json({ photos });
  } catch (e: any) {
    console.error('Photo fetch error:', e);
    return NextResponse.json({ 
      error: 'Failed to fetch photos',
      photos: []
    }, { status: 500 });
  }
}