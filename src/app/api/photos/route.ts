import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createPhotoEntry } from '@/lib/notion-dashboard';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string;
    const description = formData.get('description') as string;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Missing file or project ID' }, { status: 400 });
    }

    // Upload file to Vercel Blob storage
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Create an entry in the Notion "Photos" database
    await createPhotoEntry({
      projectId,
      description: description || file.name,
      photoUrl: blob.url,
    });

    return NextResponse.json({ ok: true, url: blob.url });

  } catch (e: any) {
    console.error('Photo upload error:', e);
    return NextResponse.json({ error: e.message || 'Server error during photo upload' }, { status: 500 });
  }
}