// Mock data for development (replace with API calls when backend is ready)

export type UserType = 'admin' | 'business' | 'candidate';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  zip_code?: string;
  user_type: UserType;
  status: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface UseCase {
  id: number;
  name: string;
  category: string;
  prompt: string;
  time: number;
  status: 'active' | 'inactive';
  created_at?: string;
}

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'James', 'Isabella', 'Oliver', 'Mia', 'Benjamin', 'Charlotte', 'Elijah', 'Amelia', 'Lucas', 'Harper', 'Mason', 'Evelyn', 'Logan'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA'];
const statuses: User['status'][] = ['active', 'inactive', 'pending'];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

const userTypes: UserType[] = ['admin', 'business', 'candidate'];

function generateUser(id: number): User {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const cityIndex = Math.floor(Math.random() * cities.length);
  
  return {
    id,
    first_name: firstName,
    last_name: lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@example.com`,
    phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    gender: Math.random() > 0.5 ? 'Male' : 'Female',
    date_of_birth: randomDate(new Date(1970, 0, 1), new Date(2000, 11, 31)),
    city: cities[cityIndex],
    state: states[cityIndex],
    country: 'USA',
    user_type: userTypes[Math.floor(Math.random() * userTypes.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    created_at: randomDate(new Date(2023, 0, 1), new Date()),
  };
}

// Generate 100 mock users
export const mockUsers: User[] = Array.from({ length: 100 }, (_, i) => generateUser(i + 1));

// Mock categories
export const mockCategories: Category[] = [
  { id: 1, name: 'Communication', status: 'active', created_at: '2024-01-15' },
  { id: 2, name: 'Technology', status: 'active', created_at: '2024-01-20' },
  { id: 3, name: 'Sales', status: 'active', created_at: '2024-02-01' },
  { id: 4, name: 'Marketing', status: 'inactive', created_at: '2024-02-10' },
];

// Mock use cases
export const mockUseCases: UseCase[] = [
  { id: 1, name: 'Laravel', category: 'Technology', prompt: 'Generate 10 Question Based On Basic Laravel', time: 5, status: 'active', created_at: '2024-01-15' },
  { id: 2, name: 'Sales Communication', category: 'Communication', prompt: 'For The Sale Communication Generate 10 Mcq Question With Options', time: 10, status: 'active', created_at: '2024-01-20' },
  { id: 3, name: 'Java Tech', category: 'Technology', prompt: 'Generate 10 Question Based On Java Like Mcq', time: 10, status: 'active', created_at: '2024-02-01' },
  { id: 4, name: 'English Communication', category: 'Communication', prompt: '10 Question Based On English Communication In Mcq Type', time: 10, status: 'active', created_at: '2024-02-10' },
];

export interface UsersResponse {
  total: number;
  page: number;
  page_size: number;
  items: User[];
}

export function getMockUsers(params: {
  page?: number;
  page_size?: number;
  search?: string;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';
}): UsersResponse {
  const { page = 1, page_size = 10, search = '', sort_field = 'id', sort_order = 'asc' } = params;
  
  let filtered = [...mockUsers];
  
  // Search
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.first_name.toLowerCase().includes(s) ||
        u.last_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s)
    );
  }
  
  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sort_field as keyof User] ?? '';
    const bVal = b[sort_field as keyof User] ?? '';
    if (aVal < bVal) return sort_order === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort_order === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Paginate
  const start = (page - 1) * page_size;
  const items = filtered.slice(start, start + page_size);
  
  return {
    total: filtered.length,
    page,
    page_size,
    items,
  };
}

export function getMockCategories(search?: string): Category[] {
  if (!search) return mockCategories;
  return mockCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
}

export function getMockUseCases(search?: string): UseCase[] {
  if (!search) return mockUseCases;
  return mockUseCases.filter((u) => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.category.toLowerCase().includes(search.toLowerCase())
  );
}
