import type {
  CompanyLoginResponse,
  CompanyModuleAssignment,
  DocumentsResponse,
  DocumentItem,
  DocumentTagsResponse,
  DocumentTag,
  DocumentSearchResponse,
} from '@/types';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface CompanyCurrentUser {
  id: string;
  email: string;
  username: string;
  role: string;
  company: { id: string; name: string; slug: string };
}

class CompanyApiClient {
  private accessToken: string | null = null;
  private currentUser: CompanyCurrentUser | null = null;
  private companySlug: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<TokenResponse> | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCompanySlug(): string | null {
    return this.companySlug;
  }

  private handleSessionExpired() {
    this.accessToken = null;
    this.currentUser = null;
    this.companySlug = null;
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/company/login';
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refresh();

    try {
      await this.refreshPromise;
      return true;
    } catch {
      return false;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async login(email: string, password: string): Promise<CompanyLoginResponse> {
    const res = await fetch('/api/company/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data: CompanyLoginResponse = await res.json();
    this.accessToken = data.access_token;
    this.companySlug = data.companySlug;
    this.currentUser = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.username,
      role: data.user.role,
      company: data.user.company,
    };
    return data;
  }

  async refresh(): Promise<TokenResponse> {
    const res = await fetch('/api/company/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      this.accessToken = null;
      this.currentUser = null;
      this.companySlug = null;
      throw new Error('Session expired');
    }

    const data: TokenResponse = await res.json();
    this.accessToken = data.access_token;
    return data;
  }

  async logout(): Promise<void> {
    await fetch('/api/company/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    this.accessToken = null;
    this.currentUser = null;
    this.companySlug = null;
  }

  async getMe(): Promise<CompanyCurrentUser> {
    const data = await this.request<{ user: CompanyCurrentUser }>('/api/company/auth/me');
    this.currentUser = data.user;
    this.companySlug = data.user.company.slug;
    return data.user;
  }

  async getModules(): Promise<CompanyModuleAssignment[]> {
    const data = await this.request<{ modules: CompanyModuleAssignment[] }>('/api/company/modules');
    return data.modules;
  }

  // ---------- Documents ----------

  async getDocuments(filters?: { tagId?: string; status?: string; limit?: number; offset?: number }): Promise<DocumentsResponse> {
    const params = new URLSearchParams();
    if (filters?.tagId) params.set('tagId', filters.tagId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<DocumentsResponse>(`/api/company/modules/documents${qs ? `?${qs}` : ''}`);
  }

  async getDocument(id: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/api/company/modules/documents/${id}`);
  }

  async uploadDocument(file: File, title?: string, tagIds?: string[]): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tagIds && tagIds.length > 0) formData.append('tagIds', JSON.stringify(tagIds));
    return this.requestFormData<DocumentItem>('/api/company/modules/documents', formData);
  }

  async updateDocument(id: string, data: { title?: string; tagIds?: string[] }): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/api/company/modules/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async searchDocuments(query: string, limit?: number): Promise<DocumentSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    return this.request<DocumentSearchResponse>(`/api/company/modules/documents/search?${params}`);
  }

  // ---------- Document Tags ----------

  async getDocumentTags(): Promise<DocumentTagsResponse> {
    return this.request<DocumentTagsResponse>('/api/company/modules/documents/tags');
  }

  async createDocumentTag(data: { name: string; slug: string; color?: string }): Promise<DocumentTag> {
    return this.request<DocumentTag>('/api/company/modules/documents/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocumentTag(id: string, data: { name?: string; slug?: string; color?: string }): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/documents/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocumentTag(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/documents/tags/${id}`, {
      method: 'DELETE',
    });
  }

  async request<T>(
    path: string,
    options: RequestInit = {},
    retried: boolean = false
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(path, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401 && !retried) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(path, options, true);
      }
      this.handleSessionExpired();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  }

  async requestFormData<T>(
    path: string,
    formData: FormData,
    retried: boolean = false
  ): Promise<T> {
    const headers: HeadersInit = {};
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (res.status === 401 && !retried) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.requestFormData<T>(path, formData, true);
      }
      this.handleSessionExpired();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  }
}

export const companyApi = new CompanyApiClient();
