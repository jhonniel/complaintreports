export interface SeedDepartment {
  id: string
  name: string
  description: string
}

export const DEFAULT_DEPARTMENTS: SeedDepartment[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    name: 'City Engineering',
    description: 'Roads, drainage, and engineering works.',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    name: 'Public Works',
    description: 'Public facilities and maintenance.',
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    name: 'Environment',
    description: 'Environmental protection and sanitation.',
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    name: 'Health',
    description: 'Public health services.',
  },
  {
    id: '22222222-2222-4222-8222-222222222205',
    name: 'Public Safety',
    description: 'Peace and order and emergency response.',
  },
  {
    id: '22222222-2222-4222-8222-222222222206',
    name: 'General Services',
    description: 'General city services.',
  },
  {
    id: '22222222-2222-4222-8222-222222222207',
    name: 'Other',
    description: 'Unassigned or cross-office concerns.',
  },
]
