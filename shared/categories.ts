export interface SeedCategory {
  id: string
  name: string
  description: string
}

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Public Safety',
    description: 'Crime, street safety, lighting, and emergency concerns.',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Road and Transportation',
    description: 'Roads, traffic, sidewalks, and public transport.',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Infrastructure',
    description: 'Buildings, drainage, bridges, and public structures.',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Garbage / Waste Management',
    description: 'Collection, dumping, and sanitation issues.',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'Water',
    description: 'Water supply, leaks, and water quality.',
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: 'Electricity',
    description: 'Power outages, lines, and electrical hazards.',
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: 'Public Services',
    description: 'General city services and community facilities.',
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    name: 'Government Services',
    description: 'Permits, offices, and civic service concerns.',
  },
  {
    id: '11111111-1111-4111-8111-111111111109',
    name: 'Health',
    description: 'Public health, clinics, and sanitation related to health.',
  },
  {
    id: '11111111-1111-4111-8111-111111111110',
    name: 'Environment',
    description: 'Trees, pollution, flooding, and environmental hazards.',
  },
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Other',
    description: 'Concerns that do not fit the listed categories.',
  },
]
