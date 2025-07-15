import axios, { AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: AxiosRequestConfig = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers,
        data: options.data,
        params: options.params,
        withCredentials: false,
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data) {
        throw new Error(error.response.data.error || 'Network error');
      }
      throw new Error('Network error');
    }
  }

  // Auth endpoints
  async signUp(email: string, password: string, username: string, displayName: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      data: { email, password, username, displayName },
    });
  }

  async signIn(email: string, password: string) {
    const response = await this.request('/auth/signin', {
      method: 'POST',
      data: { email, password },
    });
    if (response.session?.access_token) {
      this.setToken(response.session.access_token);
    }
    return response;
  }

  async signOut() {
    const response = await this.request('/auth/signout', { method: 'POST' });
    this.setToken(null);
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Task endpoints
  async getTasks() {
    return this.request('/tasks');
  }

  async createTask(task: { name: string; duration_hours: number; points: number }) {
    return this.request('/tasks', {
      method: 'POST',
      data: task,
    });
  }

  async updateTask(id: string, task: { name: string; duration_hours: number; points: number }) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      data: task,
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async getTodayCompletions() {
    return this.request('/tasks/completions/today');
  }

  async updateTaskCompletion(taskId: string, actualDurationHours: number) {
    return this.request('/tasks/completions', {
      method: 'POST',
      data: {
        task_id: taskId,
        actual_duration_hours: actualDurationHours,
      },
    });
  }

  // Challenge endpoints
  async getChallenges() {
    return this.request('/challenges');
  }

  async createChallenge(challenge: {
    challenger_username: string;
    duration_type: string;
    duration_count: number;
  }) {
    return this.request('/challenges', {
      method: 'POST',
      data: challenge,
    });
  }

  async respondToChallenge(id: string, accept: boolean) {
    return this.request(`/challenges/${id}/respond`, {
      method: 'PUT',
      data: { accept },
    });
  }

  async cancelChallenge(id: string) {
    return this.request(`/challenges/${id}/cancel`, { method: 'PUT' });
  }

  // User endpoints
  async getTopUsers() {
    return this.request('/users/top');
  }

  async searchUsers(query: string) {
    return this.request(`/users/search`, { params: { q: query } });
  }

  // Score endpoints
  async getDashboardData() {
    return this.request('/scores/dashboard');
  }

  async getCalendarData(month: number, year: number) {
    return this.request('/scores/calendar', { params: { month, year } });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);