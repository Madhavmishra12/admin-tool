// Database service using local FastAPI backend
import { apiFetch } from "./api";

// Types
export type UserType = 'admin' | 'business' | 'candidate';

export interface User {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  user_type?: UserType;
  status?: string;
  profile_photo_url?: string;
  metadata?: Record<string, any>;
  onboarding?: {
    professional_identity?: string;
    background_category?: string;
    experience_level?: string;
    career_objective?: string;
    onboarding_step?: number;
    onboarding_completed?: boolean;
    onboarding_answers?: Record<string, any>;
  };
  resume?: {
    filename: string;
    upload_date: string;
    file_size: string;
    url: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  status?: string;
  created_at: string;
}

export interface UseCase {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  status?: string;
  created_at: string;
}

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

// User CRUD operations
export async function fetchUsers(params: { page: number; page_size: number; search?: string }): Promise<{ total: number; items: User[] }> {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    page_size: params.page_size.toString(),
    ...(params.search && { search: params.search }),
  });
  const result = await apiFetch<any>(`/users?${queryParams}`);
  return {
    total: result.total || 0,
    items: (result.items || []) as User[]
  };
}

// Fetch candidates (all users from the database)
export async function fetchCandidates(params: {
  page: number;
  page_size: number;
  search?: string;
  status?: string;
  date_filter?: string;
}): Promise<{ total: number; items: User[] }> {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    page_size: params.page_size.toString(),
    ...(params.search && { search: params.search }),
  });
  const result = await apiFetch<any>(`/users?${queryParams}`);
  return {
    total: result.total || 0,
    items: (result.items || []) as User[]
  };
}

export async function fetchCandidateById(id: number): Promise<User> {
  return apiFetch<User>(`/candidates/${id}`);
}

export async function regenerateCandidateQR(id: number): Promise<{ success: boolean; token: string }> {
  return apiFetch<{ success: boolean; token: string }>(`/candidates/${id}/regenerate-qr`, {
    method: 'POST'
  });
}

export async function resetCandidateLogin(id: number): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/candidates/${id}/reset-login`, {
    method: 'POST'
  });
}

export async function uploadUserProfilePhoto(userId: number, file: File): Promise<{ success: boolean; url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/${userId}/photo`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload photo');
  }

  return response.json();
}

// Bulk update candidates
export async function bulkUpdateCandidates(ids: number[], data: Partial<User>): Promise<void> {
  // Not directly supported in simple backend, but can be simulated
  for (const id of ids) {
    await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
}

// Bulk delete candidates
export async function bulkDeleteCandidates(ids: number[]): Promise<void> {
  for (const id of ids) {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
  }
}

export async function createUser(userData: Partial<User>): Promise<User> {
  return apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id: number, userData: Partial<User>): Promise<User> {
  return apiFetch<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch<void>(`/users/${id}`, {
    method: 'DELETE',
  });
}

// Category CRUD operations
export async function fetchCategories(search?: string): Promise<Category[]> {
  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<Category[]>(`/categories${queryParams}`);
}

export async function createCategory(categoryData: Partial<Category>): Promise<Category> {
  return apiFetch<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
}

export async function updateCategory(id: number, categoryData: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
}

export async function deleteCategory(id: number): Promise<void> {
  await apiFetch<void>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// UseCase CRUD operations
export async function fetchUseCases(search?: string): Promise<UseCase[]> {
  const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch<UseCase[]>(`/use-cases${queryParams}`);
}

export async function createUseCase(useCaseData: Partial<UseCase>): Promise<UseCase> {
  return apiFetch<UseCase>('/use-cases', {
    method: 'POST',
    body: JSON.stringify(useCaseData),
  });
}

export async function updateUseCase(id: number, useCaseData: Partial<UseCase>): Promise<UseCase> {
  return apiFetch<UseCase>(`/use-cases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(useCaseData),
  });
}

export async function deleteUseCase(id: number): Promise<void> {
  await apiFetch<void>(`/use-cases/${id}`, {
    method: 'DELETE',
  });
}

// Dashboard stats
export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/dashboard/stats');
}

// Admin login
export async function adminLogin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  return apiFetch<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

// User authentication
export interface AuthUser {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export async function userSignup(data: { email: string; password: string; first_name?: string; last_name?: string }): Promise<{ user: AuthUser; token: string; requires_verification: boolean }> {
  // Use dedicated signup endpoint that hashes password and returns token in one step
  const result = await apiFetch<any>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return {
    user: result.user as AuthUser,
    token: result.token,
    requires_verification: false
  };
}

export async function userLogin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const result = await adminLogin(email, password);
  return {
    token: result.token,
    user: result.user as unknown as AuthUser
  };
}

export async function verifyEmail(token: string): Promise<{ success: boolean; token: string; user: AuthUser }> {
  return { success: true, token, user: { id: 1, email: 'test@example.com', first_name: 'Test' } };
}

export async function resendVerification(email: string): Promise<{ success: boolean; verification_token: string; first_name: string }> {
  return { success: true, verification_token: 'mock', first_name: 'Test' };
}

export async function sendVerificationEmail(email: string, firstName: string, verificationToken: string, appUrl: string): Promise<void> {
  console.log('Verification email simulated:', email);
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; reset_token?: string; first_name?: string; email?: string }> {
  return { success: true, message: 'Simulated' };
}

export async function sendPasswordResetEmail(email: string, firstName: string, resetToken: string, appUrl: string): Promise<void> {
  console.log('Reset email simulated:', email);
}

export async function updatePassword(data: { email?: string; new_password: string; reset_token?: string }): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Simulated' };
}

export async function sendWelcomeEmail(email: string, firstName: string, provider: string): Promise<void> {
  console.log('Welcome email simulated:', email);
}

// Magic link login
export async function generateMagicToken(userId: number): Promise<string> {
  //userId is not used in mock, we'd need email. For now returning mock
  return 'mock-token';
}

export async function generateMagicLink(email: string): Promise<{ success: boolean; token: string }> {
  return apiFetch('/auth/generate-magic-link', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function verifyMagicLink(token: string): Promise<{ success: boolean; token: string; user: AuthUser; message?: string }> {
  return apiFetch<any>(`/auth/verify-magic-link?token=${token}`);
}

export async function sendMagicLinkEmail(email: string, firstName: string, loginToken: string, appUrl: string): Promise<void> {
  console.log('Magic link email simulated:', email);
}
