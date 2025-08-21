// src/app/api/photos/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { notion, PHOTOS_DB_ID } from '@/lib/notion-dashboard';

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

    // First, let's check the Photos database structure
    console.log('Checking Photos database structure...');
    const photosDB = await notion.databases.retrieve({ database_id: PHOTOS_DB_ID });
    const properties = Object.keys((photosDB as any).properties);
    console.log('Photos DB properties:', properties);

    // Try different possible property names for files
    let filesProperty = 'Files & media';
    if (!properties.includes('Files & media')) {
      // Try alternative names
      const possibleNames = ['Photo', 'Files', 'Media', 'Image', 'Attachment'];
      const foundProperty = possibleNames.find(name => properties.includes(name));
      if (foundProperty) {
        filesProperty = foundProperty;
        console.log(`Using alternative files property: ${filesProperty}`);
      } else {
        console.log('No files property found, trying with Files & media anyway');
      }
    }

    // Create an entry in the Notion Photos database
    console.log('Creating Notion page...');
    const pageProperties: any = {
      'Name': { title: [{ text: { content: description || file.name } }] },
      'Projects': { relation: [{ id: projectId }] }
    };

    // Add files property if it exists
    if (properties.includes(filesProperty)) {
      pageProperties[filesProperty] = { 
        files: [{ 
          name: description || file.name,
          external: { url: blob.url } 
        }] 
      };
    }

    console.log('Creating page with properties:', Object.keys(pageProperties));

    await notion.pages.create({
      parent: { database_id: PHOTOS_DB_ID },
      properties: pageProperties
    } as any);

    console.log('Photo entry created successfully');

    return NextResponse.json({ 
      ok: true, 
      url: blob.url,
      message: 'Photo uploaded successfully',
      debug: {
        photosDBProperties: properties,
        filesProperty,
        blobUrl: blob.url
      }
    });

  } catch (e: any) {
    console.error('Photo upload error:', e);
    console.error('Error details:', {
      name: e.name,
      message: e.message,
      code: e.code,
      status: e.status
    });
    
    return NextResponse.json({ 
      error: e?.message || 'Failed to upload photo',
      debug: {
        errorType: e.constructor.name,
        errorCode: e.code,
        errorStatus: e.status
      }
    }, { status: 500 });
  }
}