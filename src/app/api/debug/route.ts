// src/app/api/debug/route.ts
import { NextResponse } from 'next/server'
import { notion, PROJECTS_DB_ID, PHOTOS_DB_ID, IMPROVEMENTS_DB_ID } from '@/lib/notion-dashboard'

export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    databases: {},
    sampleData: {},
    errors: [] as string[],
  }

  try {
    // Check Projects database structure
    const projectsDB = await notion.databases.retrieve({ database_id: PROJECTS_DB_ID });
    debug.databases.projects = {
      id: PROJECTS_DB_ID,
      title: (projectsDB as any)?.title?.[0]?.plain_text,
      properties: Object.keys((projectsDB as any)?.properties || {}),
    };

    // Get sample project data
    const sampleProjects = await notion.databases.query({
      database_id: PROJECTS_DB_ID,
      page_size: 3
    });
    debug.sampleData.projects = (sampleProjects as any).results.map((p: any) => ({
      id: p.id,
      properties: Object.keys(p.properties),
      status: p.properties.Status?.select?.name || p.properties.Status?.status?.name,
      project: p.properties.Project?.title?.[0]?.plain_text,
      client: p.properties.Client?.rich_text?.[0]?.plain_text || p.properties.Client?.select?.name,
    }));

  } catch (e: any) {
    debug.errors.push(`Projects DB error: ${e?.message}`);
  }

  try {
    // Check Photos database structure
    const photosDB = await notion.databases.retrieve({ database_id: PHOTOS_DB_ID });
    debug.databases.photos = {
      id: PHOTOS_DB_ID,
      title: (photosDB as any)?.title?.[0]?.plain_text,
      properties: Object.keys((photosDB as any)?.properties || {}),
    };
  } catch (e: any) {
    debug.errors.push(`Photos DB error: ${e?.message}`);
  }

  try {
    // Check Improvements database structure
    const improvementsDB = await notion.databases.retrieve({ database_id: IMPROVEMENTS_DB_ID });
    debug.databases.improvements = {
      id: IMPROVEMENTS_DB_ID,
      title: (improvementsDB as any)?.title?.[0]?.plain_text,
      properties: Object.keys((improvementsDB as any)?.properties || {}),
    };
  } catch (e: any) {
    debug.errors.push(`Improvements DB error: ${e?.message}`);
  }

  // Test a simple query to see what's actually in the database
  try {
    const testQuery = await notion.databases.query({
      database_id: PROJECTS_DB_ID,
      page_size: 1
    });
    
    if ((testQuery as any).results.length > 0) {
      const sample = (testQuery as any).results[0];
      debug.sampleData.actualProperties = Object.keys(sample.properties);
      debug.sampleData.statusValue = sample.properties.Status;
      debug.sampleData.projectValue = sample.properties.Project;
    }
  } catch (e: any) {
    debug.errors.push(`Test query error: ${e?.message}`);
  }

  return NextResponse.json(debug, { 
    status: debug.errors.length ? 500 : 200,
    headers: { 'Content-Type': 'application/json' }
  });
}