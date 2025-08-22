// Mock data to use when Notion API is unavailable
export const mockProjects = [
  {
    id: 'mock-project-1',
    title: 'Bathroom Renovation - Smith Residence',
    client: 'John Smith',
    builder: 'ABC Construction',
    location: '123 Oak Street, Springfield, IL',
    status: 'In Progress',
    budget: '$15,000',
    spent: '$8,500',
    budgetSpent: '57%',
    totalHours: '45.5',
    totalExpenses: '$1,200',
    deadline: '2024-03-15',
    projectManager: 'Mike Johnson',
    team: 'Team Alpha',
    description: 'Complete bathroom renovation including plumbing, tiling, and fixtures.',
    priority: 'High',
    startDate: '2024-01-15',
    endDate: '2024-03-15',
    progress: 65
  },
  {
    id: 'mock-project-2',
    title: 'Kitchen Plumbing Update - Brown House',
    client: 'Sarah Brown',
    builder: 'Delta Plumbing Co',
    location: '456 Pine Avenue, Springfield, IL',
    status: 'Planning',
    budget: '$8,500',
    spent: '$0',
    budgetSpent: '0%',
    totalHours: '0',
    totalExpenses: '$0',
    deadline: '2024-04-01',
    projectManager: 'Lisa Davis',
    team: 'Team Beta',
    description: 'Update kitchen plumbing for new appliances and island installation.',
    priority: 'Medium',
    startDate: '2024-03-01',
    endDate: '2024-04-01',
    progress: 5
  },
  {
    id: 'mock-project-3',
    title: 'Main Line Repair - Johnson Property',
    client: 'Robert Johnson',
    builder: 'Emergency Plumbing Services',
    location: '789 Elm Drive, Springfield, IL',
    status: 'Completed',
    budget: '$3,200',
    spent: '$2,890',
    budgetSpent: '90%',
    totalHours: '18',
    totalExpenses: '$2,890',
    deadline: '2024-01-30',
    projectManager: 'Tom Wilson',
    team: 'Emergency Team',
    description: 'Emergency repair of main water line break.',
    priority: 'Critical',
    startDate: '2024-01-25',
    endDate: '2024-01-30',
    progress: 100
  }
];

export const mockImprovements = [
  {
    id: 'mock-improvement-1',
    title: 'Install better pressure relief valve',
    status: 'Open',
    projectName: 'Bathroom Renovation - Smith Residence',
    description: 'Current pressure relief valve is outdated and needs replacement with more efficient model.',
    priority: 'High',
    assignee: 'Mike Johnson'
  },
  {
    id: 'mock-improvement-2',
    title: 'Add water hammer arrestors',
    status: 'In Progress',
    projectName: 'Kitchen Plumbing Update - Brown House',
    description: 'Install water hammer arrestors to prevent pipe noise when appliances shut off.',
    priority: 'Medium',
    assignee: 'Lisa Davis'
  },
  {
    id: 'mock-improvement-3',
    title: 'Update pipe insulation',
    status: 'Done',
    projectName: 'Main Line Repair - Johnson Property',
    description: 'Replace old pipe insulation with modern materials for better efficiency.',
    priority: 'Low',
    assignee: 'Tom Wilson'
  },
  {
    id: 'mock-improvement-4',
    title: 'Install smart water shutoff valve',
    status: 'Open',
    projectName: 'Bathroom Renovation - Smith Residence',
    description: 'Add smart water shutoff valve for leak detection and prevention.',
    priority: 'Medium',
    assignee: 'Mike Johnson'
  }
];

export const mockTasks = [
  {
    id: 'mock-task-1',
    title: 'Install bathroom fixtures',
    description: 'Install toilet, vanity, and bathtub in master bathroom',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Mike Johnson',
    dueDate: '2024-02-15',
    projectId: 'mock-project-1',
    projectName: 'Bathroom Renovation - Smith Residence',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-01T14:30:00Z',
    completed: false
  },
  {
    id: 'mock-task-2',
    title: 'Run new water lines',
    description: 'Install new water supply lines for kitchen island',
    status: 'Open',
    priority: 'Medium',
    assignee: 'Lisa Davis',
    dueDate: '2024-03-10',
    projectId: 'mock-project-2',
    projectName: 'Kitchen Plumbing Update - Brown House',
    createdAt: '2024-01-25T09:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
    completed: false
  },
  {
    id: 'mock-task-3',
    title: 'Pressure test main line',
    description: 'Test repaired main line for leaks and proper pressure',
    status: 'Done',
    priority: 'Critical',
    assignee: 'Tom Wilson',
    dueDate: '2024-01-29',
    projectId: 'mock-project-3',
    projectName: 'Main Line Repair - Johnson Property',
    createdAt: '2024-01-26T08:00:00Z',
    updatedAt: '2024-01-29T16:00:00Z',
    completed: true
  }
];

export const mockPhotos = [
  {
    id: 'mock-photo-1',
    projectId: 'mock-project-1',
    description: 'Before photo - Original bathroom layout',
    photoUrl: 'https://via.placeholder.com/400x300/cccccc/666666?text=Bathroom+Before',
    date: '2024-01-15'
  },
  {
    id: 'mock-photo-2',
    projectId: 'mock-project-1',
    description: 'Progress photo - Plumbing rough-in complete',
    photoUrl: 'https://via.placeholder.com/400x300/cccccc/666666?text=Plumbing+Progress',
    date: '2024-02-01'
  },
  {
    id: 'mock-photo-3',
    projectId: 'mock-project-3',
    description: 'Completed main line repair',
    photoUrl: 'https://via.placeholder.com/400x300/cccccc/666666?text=Main+Line+Fixed',
    date: '2024-01-30'
  }
];

export const mockExpenses = [
  {
    id: 'mock-expense-1',
    projectId: 'mock-project-1',
    description: 'High-end bathroom fixtures',
    amount: '$2,400',
    category: 'Materials',
    date: '2024-01-20',
    vendor: 'Plumbing Supply Co',
    status: 'Paid'
  },
  {
    id: 'mock-expense-2',
    projectId: 'mock-project-1',
    description: 'Specialized tile installation tools',
    amount: '$350',
    category: 'Tools',
    date: '2024-01-25',
    vendor: 'Tool Depot',
    status: 'Pending'
  },
  {
    id: 'mock-expense-3',
    projectId: 'mock-project-3',
    description: 'Emergency repair materials',
    amount: '$890',
    category: 'Materials',
    date: '2024-01-26',
    vendor: 'Emergency Supply',
    status: 'Paid'
  }
];

export const mockClients = [
  {
    id: 'mock-client-1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    address: '123 Oak Street, Springfield, IL'
  },
  {
    id: 'mock-client-2',
    name: 'Sarah Brown',
    email: 'sarah.brown@email.com',
    phone: '(555) 234-5678',
    address: '456 Pine Avenue, Springfield, IL'
  },
  {
    id: 'mock-client-3',
    name: 'Robert Johnson',
    email: 'robert.johnson@email.com',
    phone: '(555) 345-6789',
    address: '789 Elm Drive, Springfield, IL'
  }
];

export const mockComments = [
  {
    id: 'mock-comment-1',
    taskId: 'mock-task-1',
    content: 'Fixtures have arrived and are ready for installation. Starting tomorrow morning.',
    author: 'Mike Johnson',
    createdAt: '2024-02-01T09:30:00Z'
  },
  {
    id: 'mock-comment-2',
    taskId: 'mock-task-1',
    content: 'Installation is 75% complete. Should finish by end of day.',
    author: 'Mike Johnson',
    createdAt: '2024-02-01T14:45:00Z'
  },
  {
    id: 'mock-comment-3',
    taskId: 'mock-task-3',
    content: 'Pressure test completed successfully. All systems normal.',
    author: 'Tom Wilson',
    createdAt: '2024-01-29T15:30:00Z'
  }
];

// Helper function to determine if we should use mock data
export const shouldUseMockData = (): boolean => {
  // Use mock data if in development or if NOTION_TOKEN is not set
  return process.env.NODE_ENV === 'development' || !process.env.NOTION_TOKEN;
};

// Check if running in a restricted environment (like GitHub Actions)
export const isRestrictedEnvironment = (): boolean => {
  return !!(process.env.GITHUB_ACTIONS || process.env.CI);
};