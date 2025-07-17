import axios, { AxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T = any>(endpoint: string, options: AxiosRequestConfig = {}, retryCount = 0): Promise<T> {
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
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        // Handle rate limiting
        if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
          const waitTime = RETRY_DELAY * Math.pow(2, retryCount);
          await this.delay(waitTime);
          return this.request(endpoint, options, retryCount + 1);
        }

        // Handle token expiration
        if (error.response?.status === 401) {
          this.setToken(null);
          window.location.href = '/';
          throw new Error('Session expired. Please sign in again.');
        }

        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      
      throw new Error('Network error. Please try again later.');
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

  async createTask(task: { name: string; duration_hours: number; points: number; description?: string }) {
    return this.request('/tasks', {
      method: 'POST',
      data: task,
    });
  }

  async updateTask(id: string, task: { name: string; duration_hours: number; points: number; description?: string }) {
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
    task_list: string[];
  }) {
    return this.request('/challenges', {
      method: 'POST',
      data: challenge,
    });
  }

  async respondToChallenge(id: string, accept: boolean, taskListId?: string) {
    return this.request(`/challenges/${id}/respond`, {
      method: 'PUT',
      data: { accept, task_list_id: taskListId },
    });
  }

  async cancelChallenge(id: string) {
    return this.request(`/challenges/${id}/cancel`, { method: 'PUT' });
  }

  async updateChallengeTaskProgress(taskId: string, progress: number) {
    return this.request(`/challenges/tasks/${taskId}/progress`, {
      method: 'PUT',
      data: { progress },
    });
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