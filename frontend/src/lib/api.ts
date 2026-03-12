// API helper with JWT authentication
// Configure this to point to your FastAPI backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export function getApiBase(): string {
  return API_BASE;
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function apiUpload<T>(
  path: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getApiBase()}${path}`);

    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText as T);
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}

// Auth helpers
export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function removeToken() {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// API endpoints
export const apiEndpoints = {
  login: '/auth/login',
  dashboard: '/dashboard/stats',
  users: '/users',
  userById: (id: number) => `/users/${id}`,
  uploadUsers: '/users/upload',
  categories: '/categories',
  categoryById: (id: number) => `/categories/${id}`,
  useCases: '/use-cases',
  useCaseById: (id: number) => `/use-cases/${id}`,
};

// User CRUD operations
import { User } from './mockData';

export interface UsersResponse {
  total: number;
  items: User[];
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  userGrowthPercent: number;
  usersByDay: { name: string; value: number }[];
  usersByStatus: { name: string; value: number; color: string }[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(apiEndpoints.dashboard);
}

export async function fetchUsers(params: { page: number; page_size: number; search?: string }): Promise<UsersResponse> {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    page_size: params.page_size.toString(),
    ...(params.search && { search: params.search }),
  });
  return apiFetch<UsersResponse>(`${apiEndpoints.users}?${queryParams}`);
}

export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
  return apiFetch<User>(apiEndpoints.users, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id: number, userData: Partial<User>): Promise<User> {
  return apiFetch<User>(apiEndpoints.userById(id), {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(apiEndpoints.userById(id), {
    method: 'DELETE',
  });
}

export async function uploadUsersFile(file: File, onProgress?: (percent: number) => void): Promise<{ imported: number }> {
  return apiUpload<{ imported: number }>(apiEndpoints.uploadUsers, file, onProgress);
}

// Category CRUD operations
import { Category, UseCase } from './mockData';

export async function fetchCategories(search?: string): Promise<Category[]> {
  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Category[]>(`${apiEndpoints.categories}${queryParams}`);
}

export async function createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
  return apiFetch<Category>(apiEndpoints.categories, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(apiEndpoints.categoryById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(apiEndpoints.categoryById(id), {
    method: 'DELETE',
  });
}

// UseCase CRUD operations
export async function fetchUseCases(search?: string): Promise<UseCase[]> {
  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<UseCase[]>(`${apiEndpoints.useCases}${queryParams}`);
}

export async function createUseCase(data: Omit<UseCase, 'id' | 'created_at'>): Promise<UseCase> {
  return apiFetch<UseCase>(apiEndpoints.useCases, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUseCase(id: number, data: Partial<UseCase>): Promise<UseCase> {
  return apiFetch<UseCase>(apiEndpoints.useCaseById(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUseCase(id: number): Promise<void> {
  return apiFetch<void>(apiEndpoints.useCaseById(id), {
    method: 'DELETE',
  });
}
