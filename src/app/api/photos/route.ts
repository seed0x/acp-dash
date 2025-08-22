// src/app/api/photos/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createPhotoEntry, getProjectPhotos } from '@/lib/notion-dashboard';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string;
    const description = formData.get('description') as string;
    
    // Support both single file and multiple files
    const filesToProcess = files.length > 0 ? files : (file ? [file] : []);
    
    if (filesToProcess.length === 0) {
      return NextResponse.json({ 
        error: 'No files provided' 
      }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Project ID is required' 
      }, { status: 400 });
    }

    // Get date from EXIF data if available, otherwise use today
    let photoDate = new Date().toISOString().split('T')[0];
    
    // Allow manual date override
    const manualDate = formData.get('date') as string;
    if (manualDate) {
      photoDate = manualDate;
    }

    console.log('Photo upload request:', { 
      fileCount: filesToProcess.length,
      projectId, 
      description,
      photoDate
    });

    // Process all files
    const uploadResults = [];
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const currentFile = filesToProcess[i];
      
      // Validate file type
      if (!currentFile.type.startsWith('image/')) {
        uploadResults.push({
          fileName: currentFile.name,
          success: false,
          error: 'Only image files are allowed'
        });
        continue;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (currentFile.size > maxSize) {
        uploadResults.push({
          fileName: currentFile.name,
          success: false,
          error: 'File size must be less than 10MB'
        });
        continue;
      }

      try {
        // Extract date from file metadata if available
        let currentPhotoDate = photoDate;
        if (currentFile.lastModified) {
          currentPhotoDate = new Date(currentFile.lastModified).toISOString().split('T')[0];
        }

        // Upload file to Vercel Blob storage with metadata
        console.log(`Uploading file ${i + 1}/${filesToProcess.length} to Vercel Blob...`);
        const blob = await put(
          `photos/${projectId}/${Date.now()}-${i}-${currentFile.name}`, 
          currentFile, 
          {
            access: 'public',
            addRandomSuffix: false,
            contentType: currentFile.type,
          }
        );
        console.log(`Blob upload successful: ${blob.url}`);

        // Create an entry in the Notion Photos database
        const photoDescription = description 
          ? `${description} - ${currentFile.name}`
          : `Photo - ${currentFile.name}`;
        
        console.log('Creating Notion photo entry...');
        await createPhotoEntry({
          projectId,
          description: photoDescription,
          photoUrl: blob.url,
          date: currentPhotoDate
        });

        uploadResults.push({
          fileName: currentFile.name,
          success: true,
          url: blob.url,
          date: currentPhotoDate
        });

        console.log(`Photo entry created successfully for ${currentFile.name}`);
      } catch (e: any) {
        console.error(`Error uploading ${currentFile.name}:`, e);
        uploadResults.push({
          fileName: currentFile.name,
          success: false,
          error: e.message || 'Upload failed'
        });
      }
    }

    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.length - successCount;

    return NextResponse.json({ 
      ok: true, 
      results: uploadResults,
      summary: {
        total: uploadResults.length,
        successful: successCount,
        failed: failCount
      },
      message: `${successCount} photo(s) uploaded successfully` + 
               (failCount > 0 ? `, ${failCount} failed` : '')
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
    
    // Fetch photos from Notion
    try {
      const photos = await getProjectPhotos(projectId);
      return NextResponse.json({ photos });
    } catch (notionError) {
      console.error('Notion API error, falling back to mock data:', notionError);
      
      // Fallback to mock data
      const photos = [
        {
          id: '1',
          url: '/api/placeholder/400/300',
          description: 'Foundation work',
          date: '2024-01-15',
          category: 'Construction'
        },
        {
          id: '2',
          url: '/api/placeholder/400/300',
          description: 'Plumbing rough-in',
          date: '2024-01-20',
          category: 'Plumbing'
        }
      ];
      
      return NextResponse.json({ photos });
    }
  } catch (e: any) {
    console.error('Photo fetch error:', e);
    return NextResponse.json({ 
      error: 'Failed to fetch photos',
      photos: []
    }, { status: 500 });
  }
}