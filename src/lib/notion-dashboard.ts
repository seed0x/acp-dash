// src/lib/notion-dashboard.ts
import { Client } from '@notionhq/client'
import { 
  mockProjects, 
  mockImprovements, 
  mockTasks, 
  mockPhotos, 
  mockExpenses, 
  mockClients, 
  mockComments,
  shouldUseMockData,
  isRestrictedEnvironment
} from './mock-data'

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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock bids data due to Notion API unavailability');
      
      // Filter mock projects for bidding statuses
      const biddingStatuses = ['Bidding', 'Proposal', 'Quote Sent', 'Pending', 'New Lead', 'Planning'];
      return mockProjects
        .filter(project => biddingStatuses.includes(project.status))
        .map(project => ({
          id: project.id,
          title: project.title,
          client: project.client,
          builder: project.builder,
          location: project.location,
          biddingStatus: project.status === 'Planning' ? 'Quote Sent' : 'new'
        }));
    }

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
    console.log('Falling back to mock bids data');
    
    // Fallback to mock data
    const biddingStatuses = ['Bidding', 'Proposal', 'Quote Sent', 'Pending', 'New Lead', 'Planning'];
    return mockProjects
      .filter(project => biddingStatuses.includes(project.status))
      .map(project => ({
        id: project.id,
        title: project.title,
        client: project.client,
        builder: project.builder,
        location: project.location,
        biddingStatus: project.status === 'Planning' ? 'Quote Sent' : 'new'
      }));
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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock job account pending data due to Notion API unavailability');
      
      // Return one mock project as needing setup
      return [{
        id: mockProjects[1].id, // Kitchen project
        title: mockProjects[1].title,
        client: mockProjects[1].client,
        description: 'QuickBooks job account needs to be created'
      }];
    }

    const results = await queryAll({
      database_id: PROJECTS_DB_ID,
      filter: {
        or: [
          { property: 'Job Account Setup', checkbox: { equals: false } },
          { property: 'Job Account Setup', checkbox: { is_empty: true } }
        ]
      }
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
    console.log('Falling back to mock job account pending data');
    
    // Fallback to mock data
    return [{
      id: mockProjects[1].id,
      title: mockProjects[1].title,
      client: mockProjects[1].client,
      description: 'QuickBooks job account needs to be created'
    }];
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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock improvements data due to Notion API unavailability');
      const filtered = openOnly 
        ? mockImprovements.filter(imp => imp.status !== 'Done' && imp.status !== 'Complete')
        : mockImprovements;
      return filtered;
    }

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
    console.log('Falling back to mock improvements data');
    const filtered = openOnly 
      ? mockImprovements.filter(imp => imp.status !== 'Done' && imp.status !== 'Complete')
      : mockImprovements;
    return filtered;
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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock tasks data due to Notion API unavailability');
      
      let tasks = [...mockTasks];

      // Apply filters for mock data
      if (filters?.openOnly) {
        tasks = tasks.filter(task => task.status !== 'Done' && task.status !== 'Complete');
      }

      if (filters?.status && filters.status.length > 0) {
        tasks = tasks.filter(task => filters.status!.includes(task.status));
      }

      if (filters?.priority && filters.priority.length > 0) {
        tasks = tasks.filter(task => task.priority && filters.priority!.includes(task.priority));
      }

      if (filters?.assignee) {
        tasks = tasks.filter(task => 
          task.assignee?.toLowerCase().includes(filters.assignee!.toLowerCase())
        );
      }

      if (filters?.projectId) {
        tasks = tasks.filter(task => task.projectId === filters.projectId);
      }

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
    }

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
    console.log('Falling back to mock tasks data');
    
    // Fallback to mock data on error
    let tasks = [...mockTasks];

    // Apply filters for mock data  
    if (filters?.openOnly) {
      tasks = tasks.filter(task => task.status !== 'Done' && task.status !== 'Complete');
    }

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
  // This would query a comments database in Notion
  // For now, return mock comments filtered by taskId
  return mockComments.filter(comment => comment.taskId === taskId);
}

export async function addTaskComment(taskId: string, content: string, author: string): Promise<string> {
  // This would create a new comment in Notion
  // For now, return a mock ID
  return `comment_${Date.now()}`;
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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock project options data due to Notion API unavailability');
      
      return mockProjects.map(project => ({
        id: project.id,
        title: project.title,
        subdivision: undefined // Mock data doesn't have subdivision
      }));
    }

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
    console.log('Falling back to mock project options data');
    
    return mockProjects.map(project => ({
      id: project.id,
      title: project.title,
      subdivision: undefined
    }));
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
    // Check if we should use mock data or if Notion is unavailable
    if (isRestrictedEnvironment() || shouldUseMockData() || !(await checkNotionConnection())) {
      console.log('Using mock projects data due to Notion API unavailability');
      
      // Use mock data
      let items = mockProjects.map(project => ({
        id: project.id,
        title: project.title,
        status: project.status,
        client: project.client,
        builder: project.builder,
        location: project.location,
        subdivision: undefined, // Mock data doesn't have subdivision
        deadline: project.deadline,
        budget: project.budget,
        budgetSpent: parseInt(project.budgetSpent.replace('%', '')) || 0,
        biddingStatus: project.status === 'Planning' ? 'Quote Sent' : undefined
      }));

      // Apply filters for mock data
      if (input.status && input.status !== 'All') {
        items = items.filter(item => item.status === input.status);
      }

      if (input.q) {
        const query = input.q.toLowerCase();
        items = items.filter(item =>
          [item.title, item.client, item.builder, item.location].some(v => 
            (v || '').toLowerCase().includes(query)
          )
        );
      }

      const statusOptions = Array.from(new Set(
        mockProjects.map(p => p.status).filter(Boolean)
      ));

      return { items, statusOptions };
    }

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
    console.log('Falling back to mock projects data');
    
    // Fallback to mock data on error
    let items = mockProjects.map(project => ({
      id: project.id,
      title: project.title,
      status: project.status,
      client: project.client,
      builder: project.builder,
      location: project.location,
      subdivision: undefined,
      deadline: project.deadline,
      budget: project.budget,
      budgetSpent: parseInt(project.budgetSpent.replace('%', '')) || 0,
      biddingStatus: project.status === 'Planning' ? 'Quote Sent' : undefined
    }));

    // Apply filters for mock data
    if (input.status && input.status !== 'All') {
      items = items.filter(item => item.status === input.status);
    }

    if (input.q) {
      const query = input.q.toLowerCase();
      items = items.filter(item =>
        [item.title, item.client, item.builder, item.location].some(v => 
          (v || '').toLowerCase().includes(query)
        )
      );
    }

    const statusOptions = Array.from(new Set(
      mockProjects.map(p => p.status).filter(Boolean)
    ));

    return { items, statusOptions };
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
      builder: readTextish(props, 'Builder'), // Include builder
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
        title: readTitle(taskProps, 'Task'),
        status: readTextish(taskProps, 'Status'),
        assignee: readTextish(taskProps, 'Asignee'),
        due: readTextish(taskProps, 'Due Date'),
        category: readTextish(taskProps, 'Category'),
        comment: readTextish(taskProps, 'Comment')
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