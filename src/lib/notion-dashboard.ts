// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'

export const notion = new Client({
  auth: process.env.NOTION_TOKEN || process.env.NOTION_API_KEY,
})

// Helper to check if Notion is available
let notionAvailable: boolean | null = null;

export const checkNotionConnection = async (): Promise<boolean> => {
  if (notionAvailable !== null) return notionAvailable;
  
  try {
    await notion.users.me({});
    notionAvailable = true;
    return true;
  } catch (error: any) {
    console.warn('Notion API unavailable:', error?.message || error);
    notionAvailable = false;
    return false;
  }
};

// Your actual database IDs
export const PROJECTS_DB_ID = '223333490a11817390abe4872289edaf'
export const TASKS_DB_ID = '223333490a118175b75cedd489d8fc9e'
export const PHOTOS_DB_ID = '223333490a11819cbe48f931fa6ad4b2'
export const CLIENTS_DB_ID = '223333490a11815fb8dfed884cb88a09'
export const NOTES_DB_ID = '223333490a1181898ee6c4e52f1d07cb'
export const EXPENSES_DB_ID = '223333490a118162b8dec59721702e1c'
export const IMPROVEMENTS_DB_ID = '223333490a1181efbdefdf74b0b4f6a6'
export const DOCUMENTATION_DB_ID = '223333490a11816bbcd0f0aedc40628c'

// Property readers - Fixed for proper types
const readTitle = (p: any, key: string) => p?.[key]?.title?.map((t: any) => t.plain_text).join('') || '';

const readTextish = (p: any, key?: string) => {
  if (!key || !p[key]) return undefined;
  const prop = p[key];
  if (prop.type === 'rich_text') return prop.rich_text.map((t: any) => t.plain_text).join('');
  if (prop.type === 'select') return prop.select?.name;
  if (prop.type === 'status') return prop.status?.name;
  if (prop.type === 'checkbox') return prop.checkbox;
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'files') return prop.files?.[0]?.file?.url;
  if (prop.type === 'date') return prop.date?.start;
  if (prop.type === 'multi_select') return prop.multi_select?.map((s: any) => s.name).join(', ');
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

// Get page title helper
const titleCache = new Map<string, string>();
async function getPageTitle(pageId: string): Promise<string> {
  if (titleCache.has(pageId)) return titleCache.get(pageId)!;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;
    const props = page.properties || {};
    const titleProp = Object.values(props).find((p: any) => p?.type === 'title') as any;
    const title = titleProp?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    titleCache.set(pageId, title);
    return title;
  } catch (e) { 
    console.error('Error getting page title:', e);
    return 'Untitled'; 
  }
}

// Count projects in Post & Beam phase
export const countPostAndBeam = async (): Promise<number> => {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Status', status: { equals: 'Post & Beam' } },
          { property: 'Status', status: { equals: 'Foundation' } },
          { property: 'Status', status: { equals: 'Rough-in' } },
          { property: 'Status', status: { equals: 'Rough In' } },
          { property: 'Status', status: { equals: 'Framing' } }
        ]
      }
    });
    return results.length;
  } catch (e) {
    console.error('Error counting Post & Beam projects:', e);
    return 0;
  }
};

// List active bids with bidding sub-status tracking
export const listBids = async (): Promise<Array<{ 
  id: string; 
  title: string; 
  client?: string;
  builder?: string;
  location?: string;
  biddingStatus?: string; // New field for tracking bid progress
}>> => {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Status', status: { equals: 'Bidding' } },
          { property: 'Status', status: { equals: 'Proposal' } },
          { property: 'Status', status: { equals: 'Quote Sent' } },
          { property: 'Status', status: { equals: 'Pending' } },
          { property: 'Status', status: { equals: 'New Lead' } }
        ]
      }
    });

    const bids = results.map((r: any) => {
      const props = r.properties || {};
      return {
        id: r.id,
        title: readTitle(props, 'Project'),
        client: readTextish(props, 'Client'),
        builder: readTextish(props, 'Builder'),
        location: readTextish(props, 'Location'),
        biddingStatus: readTextish(props, 'BiddingStatus') || 'new' // Track sub-status
      };
    });
    
    return bids;
  } catch (e) {
    console.error('Error listing bids:', e);
    throw new Error(`Failed to fetch bids: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
};

// List projects needing job account setup
export async function listJobAccountPending(): Promise<Array<{ 
  id: string; 
  title: string; 
  client?: string;
  description?: string; // What needs to be setup
}>> {
  try {
    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: { property: 'Job Account Setup', checkbox: { equals: false } }
    });

    const pending = results.map((r: any) => {
      const props = r.properties || {};
      return {
        id: r.id,
        title: readTitle(props, 'Project'),
        client: readTextish(props, 'Client'),
        description: 'QuickBooks job account needs to be created' // Clarify what this is
      };
    });
    
    return pending;
  } catch (e) {
    console.error('Error listing job account pending:', e);
    throw new Error(`Failed to fetch job account pending items: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// List improvements/issues with better detail
export async function listImprovements(openOnly?: boolean): Promise<Array<{ 
  id: string; 
  title: string; 
  status?: string; 
  projectName?: string;
  description?: string;
  priority?: string;
  assignee?: string;
}>> {
  try {
    const filters: any[] = [];
    if (openOnly) {
      filters.push({
        or: [
          { property: 'Status', status: { does_not_equal: 'Done' } },
          { property: 'Status', status: { does_not_equal: 'Complete' } },
          { property: 'Status', status: { is_empty: true } }
        ]
      });
    }

    const results = await queryAll({
      database_id: IMPROVEMENTS_DB_ID,
      ...(filters.length > 0 && { filter: { and: filters } })
    });

    const improvements = await Promise.all(results.map(async (r: any) => {
      const props = r.properties || {};
      const projectRelations = readRelation(props, 'Projects');
      let projectName = '';
      
      if (projectRelations.length > 0) {
        projectName = await getPageTitle(projectRelations[0].id);
      }

      return {
        id: r.id,
        title: readTitle(props, 'Improvement'),
        status: readTextish(props, 'Status') || 'Open',
        projectName,
        description: readTextish(props, 'Description'),
        priority: readTextish(props, 'Priority'),
        assignee: readTextish(props, 'Assignee')
      };
    }));
    
    return improvements;
  } catch (e) {
    console.error('Error listing improvements:', e);
    throw new Error(`Failed to fetch improvements: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Enhanced task listing with search and filtering capabilities
export async function listTasks(filters?: {
  openOnly?: boolean;
  search?: string;
  status?: string[];
  priority?: string[];
  assignee?: string;
  projectId?: string;
}): Promise<Array<{ 
  id: string; 
  title: string; 
  description?: string;
  status: string; 
  priority?: string;
  assignee?: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
  completed?: boolean;
}>> {
  try {
    const notionFilters: any[] = [];
    
    // Filter by open status if requested
    if (filters?.openOnly) {
      notionFilters.push({
        or: [
          { property: 'Status', status: { does_not_equal: 'Done' } },
          { property: 'Status', status: { does_not_equal: 'Complete' } },
          { property: 'Status', status: { is_empty: true } }
        ]
      });
    }

    // Filter by specific statuses
    if (filters?.status && filters.status.length > 0) {
      notionFilters.push({
        or: filters.status.map(status => ({
          property: 'Status', status: { equals: status }
        }))
      });
    }

    // Filter by priority
    if (filters?.priority && filters.priority.length > 0) {
      notionFilters.push({
        or: filters.priority.map(priority => ({
          property: 'Priority', select: { equals: priority }
        }))
      });
    }

    // Filter by assignee
    if (filters?.assignee) {
      notionFilters.push({
        property: 'Assignee', rich_text: { contains: filters.assignee }
      });
    }

    // Filter by project
    if (filters?.projectId) {
      notionFilters.push({
        property: 'Projects', relation: { contains: filters.projectId }
      });
    }

    const results = await queryAll({
      database_id: IMPROVEMENTS_DB_ID,
      ...(notionFilters.length > 0 && { filter: { and: notionFilters } }),
      sorts: [
        { property: 'Status', direction: 'ascending' },
        { timestamp: 'created_time', direction: 'descending' }
      ]
    });

    let tasks = await Promise.all(results.map(async (r: any) => {
      const props = r.properties || {};
      const projectRelations = readRelation(props, 'Projects');
      let projectName = '';
      let projectId = '';
      
      if (projectRelations.length > 0) {
        projectId = projectRelations[0].id;
        projectName = await getPageTitle(projectId);
      }

      const status = readTextish(props, 'Status') || 'Open';
      
      return {
        id: r.id,
        title: readTitle(props, 'Improvement'),
        description: readTextish(props, 'Description'),
        status,
        priority: readTextish(props, 'Priority'),
        assignee: readTextish(props, 'Assignee'),
        dueDate: readTextish(props, 'Due Date') || readTextish(props, 'DueDate'),
        projectId,
        projectName,
        createdAt: r.created_time,
        updatedAt: r.last_edited_time,
        completed: status === 'Done' || status === 'Complete'
      };
    }));

    // Apply client-side search filter if provided
    if (filters?.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description?.toLowerCase().includes(searchTerm) ||
        task.projectName?.toLowerCase().includes(searchTerm) ||
        task.assignee?.toLowerCase().includes(searchTerm)
      );
    }
    
    return tasks;
  } catch (e) {
    console.error('Error listing tasks:', e);
    throw new Error(`Failed to fetch tasks: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Get task details by ID
export async function getTaskDetails(taskId: string): Promise<{
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  createdAt?: string;
  updatedAt?: string;
  completed?: boolean;
} | null> {
  try {
    const page = await notion.pages.retrieve({ page_id: taskId });
    if (!('properties' in page)) return null;
    
    const props = page.properties;
    const projectRelations = readRelation(props, 'Projects');
    let projectName = '';
    let projectId = '';
    
    if (projectRelations.length > 0) {
      projectId = projectRelations[0].id;
      projectName = await getPageTitle(projectId);
    }

    const status = readTextish(props, 'Status') || 'Open';
    
    return {
      id: page.id,
      title: readTitle(props, 'Improvement'),
      description: readTextish(props, 'Description'),
      status,
      priority: readTextish(props, 'Priority'),
      assignee: readTextish(props, 'Assignee'),
      dueDate: readTextish(props, 'Due Date') || readTextish(props, 'DueDate'),
      projectId,
      projectName,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      completed: status === 'Done' || status === 'Complete'
    };
  } catch (e) {
    console.error('Error getting task details:', e);
    return null;
  }
}

// Create new improvement
export async function createImprovement(input: { 
  projectId: string; 
  title: string;
  priority?: string;
}) {
  try {
    await notion.pages.create({
      parent: { database_id: IMPROVEMENTS_DB_ID },
      properties: {
        'Improvement': { title: [{ text: { content: input.title } }] },
        'Projects': { relation: [{ id: input.projectId }] },
        'Status': { status: { name: 'Open' } },
        ...(input.priority && { 'Priority': { select: { name: input.priority } } })
      }
    } as any);
  } catch (e) {
    console.error('Error creating improvement:', e);
    throw new Error(`Failed to create improvement: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Enhanced task creation with additional fields
export async function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  status?: string;
}): Promise<string> {
  try {
    const properties: any = {
      'Improvement': { title: [{ text: { content: input.title } }] },
      'Projects': { relation: [{ id: input.projectId }] },
      'Status': { status: { name: input.status || 'Open' } }
    };

    if (input.description) {
      properties['Description'] = { rich_text: [{ text: { content: input.description } }] };
    }
    if (input.priority) {
      properties['Priority'] = { select: { name: input.priority } };
    }
    if (input.assignee) {
      properties['Assignee'] = { rich_text: [{ text: { content: input.assignee } }] };
    }
    if (input.dueDate) {
      properties['Due Date'] = { date: { start: input.dueDate } };
    }

    const response = await notion.pages.create({
      parent: { database_id: IMPROVEMENTS_DB_ID },
      properties
    } as any);

    return response.id;
  } catch (e) {
    console.error('Error creating task:', e);
    throw new Error(`Failed to create task: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Update task with enhanced fields
export async function updateTask(taskId: string, updates: {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
}): Promise<void> {
  try {
    const properties: any = {};

    if (updates.title) {
      properties['Improvement'] = { title: [{ text: { content: updates.title } }] };
    }
    if (updates.description !== undefined) {
      properties['Description'] = updates.description 
        ? { rich_text: [{ text: { content: updates.description } }] }
        : { rich_text: [] };
    }
    if (updates.status) {
      properties['Status'] = { status: { name: updates.status } };
    }
    if (updates.priority !== undefined) {
      properties['Priority'] = updates.priority 
        ? { select: { name: updates.priority } }
        : { select: null };
    }
    if (updates.assignee !== undefined) {
      properties['Assignee'] = updates.assignee 
        ? { rich_text: [{ text: { content: updates.assignee } }] }
        : { rich_text: [] };
    }
    if (updates.dueDate !== undefined) {
      properties['Due Date'] = updates.dueDate 
        ? { date: { start: updates.dueDate } }
        : { date: null };
    }

    await notion.pages.update({
      page_id: taskId,
      properties
    } as any);
  } catch (e) {
    console.error('Error updating task:', e);
    throw new Error(`Failed to update task: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Bulk update task statuses
export async function bulkUpdateTaskStatus(taskIds: string[], status: string): Promise<void> {
  try {
    await Promise.all(taskIds.map(id => 
      notion.pages.update({
        page_id: id,
        properties: {
          'Status': { status: { name: status } }
        }
      } as any)
    ));
  } catch (e) {
    console.error('Error bulk updating task status:', e);
    throw new Error(`Failed to bulk update tasks: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Note: Comments would typically be stored in a separate Notion database
// For now, we'll simulate comments as a simple structure
// In a real implementation, you'd want a dedicated COMMENTS_DB_ID

// Mock comment functions (replace with actual Notion implementation)
export async function getTaskComments(taskId: string): Promise<Array<{
  id: string;
  taskId: string;
  content: string;
  author: string;
  createdAt: string;
}>> {
  // This functionality would require a comments database in Notion
  // For now, return empty array as comments are not implemented
  console.log('Comments feature not yet implemented with Notion database');
  return [];
}

export async function addTaskComment(taskId: string, content: string, author: string): Promise<string> {
  // This functionality would require a comments database in Notion
  // For now, throw an error as comments are not implemented
  throw new Error('Comments feature not yet implemented with Notion database');
}

// Update improvement status
export async function updateImprovementStatus(id: string, status: string) {
  try {
    await notion.pages.update({ 
      page_id: id, 
      properties: { 'Status': { status: { name: status } } }
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
      properties: { 'Job Account Setup': { checkbox: value } }
    } as any);
  } catch (e) {
    console.error('Error toggling job account:', e);
    throw new Error('Failed to update job account setup');
  }
}

// List all projects for dropdowns with subdivision
export async function listProjectOptions(): Promise<Array<{ id: string; title: string; subdivision?: string }>> {
  try {
    const results = await queryAll({ 
      database_id: PROJECTS_DB_ID, 
      page_size: 100,
      sorts: [{ property: 'Project', direction: 'ascending' }]
    });
    
    const options = results.map((r: any) => ({ 
      id: r.id, 
      title: readTitle(r.properties, 'Project'),
      subdivision: readTextish(r.properties, 'Sub-Division') || readTextish(r.properties, 'Subdivision')
    }));
    
    return options;
  } catch (e) {
    console.error('Error listing project options:', e);
    throw new Error(`Failed to fetch project options: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Get projects for board view with enhanced search and filtering
export async function listProjectsBoard(input: { q?: string; status?: string }): Promise<{
  items: Array<{ 
    id: string; 
    title: string; 
    status?: string; 
    client?: string; 
    builder?: string;
    location?: string; 
    subdivision?: string; // Added subdivision
    deadline?: string;
    budget?: string;
    budgetSpent?: number;
    biddingStatus?: string;
  }>
  statusOptions: string[]
}> {
  try {
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
        builder: readTextish(props, 'Builder'),
        location: readTextish(props, 'Location'),
        subdivision: readTextish(props, 'Sub-Division') || readTextish(props, 'Subdivision'), // Include subdivision
        deadline: readTextish(props, 'Deadline'),
        budget: readTextish(props, 'Budget'),
        budgetSpent: readTextish(props, 'Budget spent') as number,
        biddingStatus: readTextish(props, 'BiddingStatus')
      };
    });

    // Apply filters
    if (input.status && input.status !== 'All') {
      items = items.filter(item => item.status === input.status);
    }

    if (input.q) {
      const query = input.q.toLowerCase();
      items = items.filter(item =>
        [item.title, item.client, item.builder, item.location, item.subdivision].some(v => 
          (v || '').toLowerCase().includes(query)
        )
      );
    }

    return { items, statusOptions };
  } catch (e) {
    console.error('Error listing projects board:', e);
    throw new Error(`Failed to fetch projects board: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Update project phase status
export async function updateProjectStatus(id: string, status: string) {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        'Status': { status: { name: status } }
      }
    } as any);
  } catch (e) {
    console.error('Error updating project status:', e);
    throw new Error('Failed to update project status');
  }
}

// Update bidding sub-status (for tracking follow-ups, won/lost, etc.)
export async function updateBiddingStatus(id: string, biddingStatus: string) {
  try {
    await notion.pages.update({
      page_id: id,
      properties: {
        'BiddingStatus': { select: { name: biddingStatus } }
      }
    } as any);
  } catch (e) {
    console.error('Error updating bidding status:', e);
    // If BiddingStatus property doesn't exist, you might need to create it in Notion first
    throw new Error('Failed to update bidding status. Make sure BiddingStatus property exists in Notion.');
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
      builder: readTextish(props, 'Builder'),
      location: readTextish(props, 'Location'),
      status: readTextish(props, 'Status'),
      subdivision: readTextish(props, 'Sub-Division') || readTextish(props, 'Subdivision'),
      budget: readTextish(props, 'Budget'),
      spent: readTextish(props, 'Spent'),
      budgetSpent: readTextish(props, 'Budget spent'),
      contract: readTextish(props, 'Contract'),
      constructionPhase: readTextish(props, 'Construction Phase'),
      documentation: readTextish(props, 'Documentation'),
      expenses: readTextish(props, 'Expenses'),
      filesMedia: readTextish(props, 'Files & media'),
      hourlyRate: readTextish(props, 'Hourly rate'),
      improvements: readTextish(props, 'Improvements'),
      jobAccountSetup: readTextish(props, 'Job Account Setup'),
      lastUpdated: readTextish(props, 'Last Updated'),
      lastEditedTime: readTextish(props, 'Last edited time'),
      needFollowUp: readTextish(props, 'Need follow up'),
      notes: readTextish(props, 'Notes'),
      options: readTextish(props, 'Options'),
      projectManager: readTextish(props, 'Project manager'),
      subDivision: readTextish(props, 'Sub-Division'),
      tasks: readTextish(props, 'Tasks'),
      timeTracking: readTextish(props, 'Time tracking'),
      totalExpenses: readTextish(props, 'Total expenses'),
      totalHours: readTextish(props, 'Total hours'),
      // Legacy properties for backward compatibility
      deadline: readTextish(props, 'Deadline'),
      team: readTextish(props, 'Team'),
      // Ensure jobNumber is populated for consistency
      jobNumber: readTextish(props, 'Job Number'),
      biddingStatus: readTextish(props, 'BiddingStatus')
    };

    // Get related photos with dates
    const photoResults = await queryAll({
      database_id: PHOTOS_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } },
      sorts: [{ property: 'Date', direction: 'descending' }] // Sort by date
    });

    const photos = photoResults.map((photo: any) => {
      const photoProps = photo.properties || {};
      const files = photoProps['Photo']?.files || [];
      return {
        id: photo.id,
        description: readTitle(photoProps, 'Name') || 'Photo',
        url: files[0]?.file?.url || files[0]?.external?.url || '',
        date: readTextish(photoProps, 'Date') // Include date
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
        title: readTitle(taskProps, 'Improvement'),
        status: readTextish(taskProps, 'Status'),
        assignee: readTextish(taskProps, 'Assignee'),
        dueDate: readTextish(taskProps, 'Due Date'),
        category: readTextish(taskProps, 'Category'),
        comment: readTextish(taskProps, 'Comment'),
        notes: readTextish(taskProps, 'Notes'),
        // Legacy field for backward compatibility
        due: readTextish(taskProps, 'Due Date')
      };
    });

    // Get related improvements with more detail
    const improvementResults = await queryAll({
      database_id: IMPROVEMENTS_DB_ID,
      filter: { property: 'Projects', relation: { contains: id } }
    });

    const improvements = improvementResults.map((improvement: any) => {
      const improvementProps = improvement.properties || {};
      return {
        id: improvement.id,
        title: readTitle(improvementProps, 'Improvement'),
        status: readTextish(improvementProps, 'Status'),
        description: readTextish(improvementProps, 'Description'),
        priority: readTextish(improvementProps, 'Priority'),
        assignee: readTextish(improvementProps, 'Assignee')
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
        name: readTitle(expenseProps, 'Name') || 'Expense',
        category: readTextish(expenseProps, 'Category'),
        value: readTextish(expenseProps, 'Amount') || readTextish(expenseProps, 'Value') || 0,
        date: readTextish(expenseProps, 'Date')
      };
    });

    return { 
      project, 
      photos, 
      tasks, 
      improvements, 
      expenses, 
      time: []
    };
  } catch (e) {
    console.error('Error getting project full:', e);
    throw new Error('Failed to fetch project details');
  }
}

// Create photo entry with automatic date
export async function createPhotoEntry(input: { 
  projectId: string; 
  description: string; 
  photoUrl: string;
  date?: string; // Optional date, defaults to today
}) {
  try {
    const photoDate = input.date || new Date().toISOString().split('T')[0];
    
    await notion.pages.create({
      parent: { database_id: PHOTOS_DB_ID },
      properties: {
        'Name': { title: [{ text: { content: input.description || 'Photo' } }] },
        'Projects': { relation: [{ id: input.projectId }] },
        'Date': { date: { start: photoDate } }, // Automatically add date
        'Photo': { 
          files: [{ 
            name: input.description || 'Photo',
            external: { url: input.photoUrl } 
          }] 
        }
      }
    } as any);
    
    console.log(`Photo created with date: ${photoDate}`);
  } catch (e) {
    console.error('Error creating photo entry:', e);
    throw new Error(`Failed to create photo entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Get photos for a specific project
export async function getProjectPhotos(projectId: string): Promise<Array<{
  id: string;
  url: string;
  description?: string;
  date: string;
  category?: string;
  photographer?: string;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}>> {
  try {
    const photoResults = await queryAll({
      database_id: PHOTOS_DB_ID,
      filter: { property: 'Projects', relation: { contains: projectId } },
      sorts: [{ property: 'Date', direction: 'descending' }]
    });

    return photoResults.map((photo: any) => {
      const photoProps = photo.properties || {};
      const files = photoProps['Photo']?.files || [];
      const url = files[0]?.file?.url || files[0]?.external?.url || '';
      
      return {
        id: photo.id,
        url,
        description: readTitle(photoProps, 'Name') || 'Photo',
        date: readTextish(photoProps, 'Date') || new Date().toISOString().split('T')[0],
        category: readTextish(photoProps, 'Category'),
        photographer: readTextish(photoProps, 'Photographer'),
        metadata: {
          fileSize: readTextish(photoProps, 'File Size')
        }
      };
    }).filter((photo) => photo.url); // Filter out photos without URLs
  } catch (e) {
    console.error('Error getting project photos:', e);
    throw new Error(`Failed to fetch project photos: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Enhanced photo search function with comprehensive filtering
export async function searchPhotos(params: {
  projectId?: string;
  search?: string; // Search in description, project name, photographer
  category?: string;
  photographer?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  projectName?: string;
  location?: string;
}): Promise<Array<{
  id: string;
  url: string;
  description?: string;
  date: string;
  category?: string;
  photographer?: string;
  projectId?: string;
  projectName?: string;
  projectLocation?: string;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}>> {
  try {
    const filters: any[] = [];

    // Filter by project if specified
    if (params.projectId) {
      filters.push({
        property: 'Projects',
        relation: { contains: params.projectId }
      });
    }

    // Filter by category if specified
    if (params.category) {
      filters.push({
        property: 'Category',
        select: { equals: params.category }
      });
    }

    // Filter by photographer if specified
    if (params.photographer) {
      filters.push({
        property: 'Photographer',
        rich_text: { contains: params.photographer }
      });
    }

    // Filter by date range
    if (params.dateFrom || params.dateTo) {
      const dateFilter: any = { property: 'Date', date: {} };
      if (params.dateFrom) {
        dateFilter.date.on_or_after = params.dateFrom;
      }
      if (params.dateTo) {
        dateFilter.date.on_or_before = params.dateTo;
      }
      filters.push(dateFilter);
    }

    const photoResults = await queryAll({
      database_id: PHOTOS_DB_ID,
      ...(filters.length > 0 && { filter: { and: filters } }),
      sorts: [{ property: 'Date', direction: 'descending' }]
    });

    // Map photos and get project information
    let photos = await Promise.all(photoResults.map(async (photo: any) => {
      const photoProps = photo.properties || {};
      const files = photoProps['Photo']?.files || [];
      const url = files[0]?.file?.url || files[0]?.external?.url || '';
      
      // Get project information
      const projectRelations = readRelation(photoProps, 'Projects');
      let projectName = '';
      let projectLocation = '';
      let projectId = '';
      
      if (projectRelations.length > 0) {
        projectId = projectRelations[0].id;
        try {
          // Get project details for name and location
          const projectPage = await notion.pages.retrieve({ page_id: projectId });
          if ('properties' in projectPage) {
            const projectProps = projectPage.properties;
            projectName = readTitle(projectProps, 'Project') || '';
            projectLocation = readTextish(projectProps, 'Location') || '';
          }
        } catch (e) {
          console.warn('Failed to get project details for photo:', e);
        }
      }
      
      return {
        id: photo.id,
        url,
        description: readTitle(photoProps, 'Name') || 'Photo',
        date: readTextish(photoProps, 'Date') || new Date().toISOString().split('T')[0],
        category: readTextish(photoProps, 'Category'),
        photographer: readTextish(photoProps, 'Photographer'),
        projectId,
        projectName,
        projectLocation,
        metadata: {
          fileSize: readTextish(photoProps, 'File Size')
        }
      };
    }));

    // Filter out photos without URLs
    photos = photos.filter((photo) => photo.url);

    // Apply text-based filters (search, project name, location)
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.toLowerCase().trim();
      photos = photos.filter(photo => 
        photo.description?.toLowerCase().includes(searchTerm) ||
        photo.projectName?.toLowerCase().includes(searchTerm) ||
        photo.photographer?.toLowerCase().includes(searchTerm) ||
        photo.category?.toLowerCase().includes(searchTerm) ||
        photo.projectLocation?.toLowerCase().includes(searchTerm)
      );
    }

    if (params.projectName && params.projectName.trim()) {
      const projectNameTerm = params.projectName.toLowerCase().trim();
      photos = photos.filter(photo => 
        photo.projectName?.toLowerCase().includes(projectNameTerm)
      );
    }

    if (params.location && params.location.trim()) {
      const locationTerm = params.location.toLowerCase().trim();
      photos = photos.filter(photo => 
        photo.projectLocation?.toLowerCase().includes(locationTerm)
      );
    }

    return photos;
  } catch (e) {
    console.error('Error searching photos:', e);
    throw new Error(`Failed to search photos: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

