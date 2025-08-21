// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

/** -------------------------------
 * Notion client + DB ID helpers
 * ------------------------------- */
export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

// Your actual database IDs
export const PROJECTS_DB_ID = '223333490a11817390abe4872289edaf'
export const TASKS_DB_ID = '223333490a118175b75cedd489d8fc9e'
export const PHOTOS_DB_ID = '223333490a11819cbe48f931fa6ad4b2'
export const CLIENTS_DB_ID = '223333490a11815fb8dfed884cb88a09'
export const NOTES_DB_ID = '223333490a1181898ee6c4e52f1d07cb'
export const EXPENSES_DB_ID = '223333490a118162b8dec59721702e1c'
export const IMPROVEMENTS_DB_ID = '223333490a1181efbdefdf74b0b4f6a6'
export const DOCUMENTATION_DB_ID = '223333490a11816bbcd0f0aedc40628c'

/** -------------------------------
 * Property readers
 * ------------------------------- */
const readTitle = (p: any, key: string) => p?.[key]?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';

const readTextish = (p: any, key?: string) => {
  if (!key || !p[key]) return undefined;
  const prop = p[key];
  if (prop.type === 'rich_text') return prop.rich_text.map((t: any) => t.plain_text).join('');
  if (prop.type === 'select') return prop.select?.name;
  if (prop.type === 'status') return prop.status?.name;
  if (prop.type === 'checkbox') return prop.checkbox;
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'files') return prop.files?.[0]?.file?.url;
  return undefined;
};

const readRelation = (p: any, key: string) => {
  if (!p[key] || p[key].type !== 'relation') return [];
  return p[key].relation || [];
};

const queryAll = async (opts: any) => {
  let results: any[] = [];
  let next_cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({ ...opts, start_cursor: next_cursor });
    results = results.concat(res.results);
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return results;
};

// Helper to resolve relation page titles
const titleCache = new Map<string, string>();
async function getPageTitle(pageId: string): Promise<string> {
  if (titleCache.has(pageId)) return titleCache.get(pageId)!;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const props = page.properties || {};
    // Find title property
    const titleProp = Object.values(props).find((p: any) => p?.type === 'title') as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    titleCache.set(pageId, title);
    return title;
  } catch { 
    return 'Untitled'; 
  }
}

/** -------------------------------
 * Public dashboard functions
 * ------------------------------- */

// Count projects in Post & Beam phase
export const countPostAndBeam = async (): Promise<number> => {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Post & Beam' } },
          { property: 'Status', select: { equals: 'Foundation' } },
          { property: 'Status', select: { equals: 'Rough-in' } }
        ]
      }
    });
    return results.length;
  } catch (e) {
    console.error('Error counting Post & Beam projects:', e);
    return 0;
  }
};

// List active bids
export const listBids = async (): Promise<Array<{ id: string; title: string; client?: string }>> => {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Bidding' } },
          { property: 'Status', select: { equals: 'Proposal' } },
          { property: 'Status', select: { equals: 'Quote Sent' } },
          { property: 'Status', select: { equals: 'Pending' } }
        ]
      }
    });

    return results.map((r: any) => {
      const props = r.properties || {};
      return {
        id: r.id,
        title: readTitle(props, 'Project'),
        client: readTextish(props, 'Client')
      };
    });
  } catch (e) {
    console.error('Error listing bids:', e);
    return [];
  }
};

// List projects needing job account setup
export async function listJobAccountPending(): Promise<Array<{ id: string; title: string; client?: string }>> {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Job Account Setup', select: { equals: 'No' } },
          { property: 'Job Account Setup', select: { is_empty: true } }
        ]
      }
    });

    return results.map((r: any) => {
      const props = r.properties || {};
      return {
        id: r.id,
        title: readTitle(props, 'Project'),
        client: readTextish(props, 'Client')
      };
    });
  } catch (e) {
    console.error('Error listing job account pending:', e);
    return [];
  }
}

// List improvements/issues
export async function listImprovements(openOnly?: boolean): Promise<Array<{ id: string; title: string; status?: string; projectName?: string }>> {
  try {
    const filters: any[] = [];
    if (openOnly) {
      filters.push({
        or: [
          { property: 'Status', select: { does_not_equal: 'Done' } },
          { property: 'Status', select: { is_empty: true } }
        ]
      });
    }

    const results = await queryAll({
      database_id: IMPROVEMENTS_DB_ID,
      ...(filters.length > 0 && { filter: { and: filters } })
    });

    return Promise.all(results.map(async (r: any) => {
      const props = r.properties || {};
      const projectRelations = readRelation(props, 'Projects');
      let projectName = '';
      
      if (projectRelations.length > 0) {
        projectName = await getPageTitle(projectRelations[0].id);
      }

      return {
        id: r.id,
        title: readTitle(props, 'Name') || readTitle(props, 'Title') || 'Untitled',
        status: readTextish(props, 'Status'),
        projectName
      };
    }));
  } catch (e) {
    console.error('Error listing improvements:', e);
    return [];
  }
}

// Create new improvement
export async function createImprovement(input: { projectId: string; title: string }) {
  try {
    await notion.pages.create({
      parent: { database_id: IMPROVEMENTS_DB_ID },
      properties: {
        'Name': { title: [{ text: { content: input.title } }] },
        'Projects': { relation: [{ id: input.projectId }] },
        'Status': { select: { name: 'Open' } }
      }
    } as any);
  } catch (e) {
    console.error('Error creating improvement:', e);
    throw new Error('Failed to create improvement');
  }
}

// Update improvement status
export async function updateImprovementStatus(id: string, status: string) {
  try {
    await notion.pages.update({ 
      page_id: id, 
      properties: { 'Status': { select: { name: status } } } 
    } as any);
  } catch (e) {
    console.error('Error updating improvement status:', e);
    throw new Error('Failed to update improvement status');
  }
}

// Toggle job account setup
export async function toggleJobAccount(id: string, value: boolean) {
  try {
    await notion.pages.update({ 
      page_id: id, 
      properties: { 'Job Account Setup': { select: { name: value ? 'Yes' : 'No' } } } 
    } as any);
  } catch (e) {
    console.error('Error toggling job account:', e);
    throw new Error('Failed to update job account setup');
  }
}

// List all projects for dropdowns
export async function listProjectOptions(): Promise<Array<{ id: string; title: string }>> {
  try {
    const results = await queryAll({ 
      database_id: PROJECTS_DB_ID, 
      page_size: 100,
      sorts: [{ property: 'Project', direction: 'ascending' }]
    });
    
    return results.map((r: any) => ({ 
      id: r.id, 
      title: readTitle(r.properties, 'Project') 
    }));
  } catch (e) {
    console.error('Error listing project options:', e);
    return [];
  }
}

// Get projects for board view with search and filtering
export async function listProjectsBoard(input: { q?: string; status?: string }): Promise<{
  items: Array<{ 
    id: string; 
    title: string; 
    status?: string; 
    client?: string; 
    location?: string; 
    deadline?: string;
    budget?: string;
    budgetSpent?: number;
  }>
  statusOptions: string[]
}> {
  try {
    // Get all projects first
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      sorts: [{ property: 'Last edited time', direction: 'descending' }]
    });

    // Extract all unique statuses
    const statusOptions = Array.from(new Set(
      results.map((r: any) => readTextish(r.properties, 'Status')).filter(Boolean)
    )) as string[];

    // Map and filter results
    let items = results.map((r: any) => {
      const props = r.properties || {};
      return {
        id: r.id,
        title: readTitle(props, 'Project'),
        status: readTextish(props, 'Status'),
        client: readTextish(props, 'Client'),
        location: readTextish(props, 'Location'),
        deadline: readTextish(props, 'Deadline'),
        budget: readTextish(props, 'Budget'),
        budgetSpent: readTextish(props, 'Budget spent') as number,
      };
    });

    // Apply filters
    if (input.status && input.status !== 'All') {
      items = items.filter(item => item.status === input.status);
    }

    if (input.q) {
      const query = input.q.toLowerCase();
      items = items.filter(item =>
        [item.title, item.client, item.location].some(v => 
          (v || '').toLowerCase().includes(query)
        )
      );
    }

    return { items, statusOptions };
  } catch (e) {
    console.error('Error listing projects board:', e);
    return { items: [], statusOptions: [] };
  }
}

// Get full project details
export async function getProjectFull(id: string): Promise<any> {
  try {
    const page: any = await notion.pages.retrieve({ page_id: id });
    const props = page.properties || {};

    const project = {
      id,
      title: readTitle(props, 'Project'),
      client: readTextish(props, 'Client'),
      location: readTextish(props, 'Location'),
      status: readTextish(props, 'Status'),
      budget: readTextish(props, 'Budget'),
      spent: readTextish(props, 'Spent'),
      budgetSpent: readTextish(props, 'Budget spent'),
      totalHours: readTextish(props, 'Total hours'),
      totalExpenses: readTextish(props, 'Total expenses'),
      deadline: readTextish(props, 'Deadline'),
      projectManager: readTextish(props, 'Project manager'),
      team: readTextish(props, 'Team'),
      subDivision: readTextish(props, 'Sub-Division'),
      constructionPhase: readTextish(props, 'Construction Phase'),
    };

    // Get related photos
    const photoResults = await queryAll({
      database_id: PHOTOS_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } }
    });

    const photos = photoResults.map((photo: any) => {
      const photoProps = photo.properties || {};
      const files = photoProps['Files & media']?.files || photoProps['Photo']?.files || [];
      return {
        id: photo.id,
        description: readTitle(photoProps, 'Name') || readTitle(photoProps, 'Title') || 'Photo',
        url: files[0]?.file?.url || files[0]?.external?.url || ''
      };
    }).filter((photo: any) => photo.url);

    // Get related tasks
    const taskResults = await queryAll({
      database_id: TASKS_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } }
    });

    const tasks = taskResults.map((task: any) => {
      const taskProps = task.properties || {};
      return {
        id: task.id,
        title: readTitle(taskProps, 'Task'),
        status: readTextish(taskProps, 'Status'),
        assignee: readTextish(taskProps, 'Asignee'),
        due: readTextish(taskProps, 'Due Date'),
        category: readTextish(taskProps, 'Category'),
        comment: readTextish(taskProps, 'Comment')
      };
    });

    // Get related improvements
    const improvementResults = await queryAll({
      database_id: IMPROVEMENTS_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } }
    });

    const improvements = improvementResults.map((improvement: any) => {
      const improvementProps = improvement.properties || {};
      return {
        id: improvement.id,
        title: readTitle(improvementProps, 'Name') || readTitle(improvementProps, 'Title') || 'Improvement',
        status: readTextish(improvementProps, 'Status')
      };
    });

    // Get related expenses
    const expenseResults = await queryAll({
      database_id: EXPENSES_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } }
    });

    const expenses = expenseResults.map((expense: any) => {
      const expenseProps = expense.properties || {};
      return {
        id: expense.id,
        name: readTitle(expenseProps, 'Name') || readTitle(expenseProps, 'Title') || 'Expense',
        category: readTextish(expenseProps, 'Category'),
        value: readTextish(expenseProps, 'Amount') || readTextish(expenseProps, 'Value') || 0
      };
    });

    return { 
      project, 
      photos, 
      tasks, 
      improvements, 
      expenses, 
      time: [] // Time tracking to be implemented if needed
    };
  } catch (e) {
    console.error('Error getting project full:', e);
    throw new Error('Failed to fetch project details');
  }
}

// Create photo entry
export async function createPhotoEntry(input: { projectId: string; description: string; photoUrl: string }) {
  try {
    await notion.pages.create({
      parent: { database_id: PHOTOS_DB_ID },
      properties: {
        'Name': { title: [{ text: { content: input.description || 'Photo' } }] },
        'Projects': { relation: [{ id: input.projectId }] },
        'Files & media': { 
          files: [{ 
            name: input.description || 'Photo',
            external: { url: input.photoUrl } 
          }] 
        }
      }
    } as any);
  } catch (e) {
    console.error('Error creating photo entry:', e);
    throw new Error('Failed to create photo entry');
  }
}