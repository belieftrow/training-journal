const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('auth_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data as T;
}

// Auth
export async function apiRegister(username: string, password: string) {
  const data = await request<{ token: string; user: { id: number; username: string } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function apiLogin(username: string, password: string) {
  const data = await request<{ token: string; user: { id: number; username: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function apiGetMe() {
  const data = await request<{ user: { id: number; username: string } }>('/auth/me');
  return data.user;
}

export function logout() {
  setToken(null);
}

// Workouts
import type { Workout } from '@/types';

export async function apiGetWorkouts(): Promise<Workout[]> {
  const data = await request<{ workouts: Workout[] }>('/workouts');
  return data.workouts;
}

export async function apiAddWorkout(workout: Workout): Promise<void> {
  await request('/workouts', {
    method: 'POST',
    body: JSON.stringify(workout),
  });
}

export async function apiDeleteWorkout(id: string): Promise<void> {
  await request(`/workouts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
