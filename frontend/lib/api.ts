import type {
  Company,
  CompaniesResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyUser,
  CompanyUsersResponse,
  CreateCompanyUserRequest,
  UpdateCompanyUserRequest,
  CompanyModule,
  CompanyModulesResponse,
  CreateCompanyModuleRequest,
  UpdateCompanyModuleRequest,
  CompanyModuleAssignmentsResponse,
  BulkUpdateModuleAssignmentsRequest,
  SidebarCompaniesResponse,
  LoginRequest,
  TokenResponse,
  FAQChatResponse,
  FAQStats,
  UserInputLogsResponse,
  LoginLogsResponse,
  SettingsResponse,
  UpdateSettingsRequest,
  ConversationMessage,
  OperationalRule,
  CreateRuleRequest,
  UpdateRuleRequest,
  RulesListResponse,
  RuleHistoryResponse,
  AdminUser,
  DocumentsResponse,
  DocumentItem,
  DocumentTagsResponse,
  DocumentTag,
  DocumentSearchResponse,
  DocumentChatResponse,
  LlmSettingsResponse,
  UpdateLlmSettingsRequest,
  CustomersResponse,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  ProductsResponse,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  ProductCategoriesResponse,
  ProductCategory,
  CsvImportResult,
  QuotationsResponse,
  Quotation,
  CreateQuotationRequest,
  OrdersResponse,
  Order,
  CreateOrderRequest,
  DeliveryNotesResponse,
  DeliveryNote,
  InvoicesResponse,
  Invoice,
  SharedLinkResponse,
  DashboardSummary,
  DashboardSalesResponse,
  DashboardRankingsResponse,
  Receivable,
  RecentOrder,
  OrderStatusCount,
  AutoSuggestionsResponse,
  OrderSuggestionsResponse,
  AiAnalysisResult,
  OcrExtraction,
  OcrExtractionsResponse,
  UpdateOcrExtractionRequest,
} from '@/types';

// Python バックエンドのURL（FAQ/Internal/Admin機能）
const PYTHON_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : 'http://localhost:8100');
const BASIC_AUTH_USER = process.env.NEXT_PUBLIC_BASIC_AUTH_USER || 'admin';
const BASIC_AUTH_PASSWORD = process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD || 'admin123';
const BASIC_AUTH_HEADER = `Basic ${btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`)}`;

interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  user: AdminUser;
}

class ApiClient {
  private accessToken: string | null = null;
  private currentUser: AdminUser | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<TokenResponse> | null = null;

  private get isMock(): boolean {
    return process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';
  }

  private getAuthEndpoint(action: string): string {
    if (this.isMock) return `/mock-auth/admin/${action}`;
    return `/api/admin/auth/${action}`;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUser;
  }

  private handleSessionExpired() {
    this.accessToken = null;
    this.currentUser = null;
    // ブラウザ環境でのみリダイレクト
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/admin/login';
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    // 既にリフレッシュ中の場合は待機
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

  // Next.js API経由の認証（DB管理）
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(this.getAuthEndpoint('login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data: AdminLoginResponse = await res.json();
    this.accessToken = data.access_token;
    this.currentUser = data.user;
    return {
      access_token: data.access_token,
      token_type: data.token_type,
    };
  }

  async refresh(): Promise<TokenResponse> {
    const res = await fetch(this.getAuthEndpoint('refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      this.accessToken = null;
      this.currentUser = null;
      throw new Error('Session expired');
    }

    const data: TokenResponse = await res.json();
    this.accessToken = data.access_token;
    return data;
  }

  async logout(): Promise<void> {
    await fetch(this.getAuthEndpoint('logout'), {
      method: 'POST',
      credentials: 'include',
    });
    this.accessToken = null;
    this.currentUser = null;
  }

  async getMe(): Promise<AdminUser | null> {
    if (!this.accessToken) return null;

    try {
      const data = await this.requestNextApi<{ user: AdminUser }>(this.getAuthEndpoint('me'));
      this.currentUser = data.user;
      return data.user;
    } catch {
      return null;
    }
  }

  // Admin User Management (Next.js API)
  async getAdminUsers(): Promise<{ users: AdminUser[]; total: number }> {
    if (this.isMock) {
      const { mockAdminUsers } = await import('@/lib/mock');
      return { users: mockAdminUsers, total: mockAdminUsers.length };
    }
    return this.requestNextApi<{ users: AdminUser[]; total: number }>('/api/admin/users');
  }

  async getAdminUser(id: string): Promise<AdminUser> {
    if (this.isMock) {
      const { mockAdminUsers } = await import('@/lib/mock');
      const user = mockAdminUsers.find((u) => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
    return this.requestNextApi<AdminUser>(`/api/admin/users/${id}`);
  }

  async createAdminUser(data: {
    username: string;
    email?: string;
    password: string;
    role?: string;
  }): Promise<AdminUser> {
    return this.requestNextApi<AdminUser>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(
    id: string,
    data: {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
    }
  ): Promise<AdminUser> {
    return this.requestNextApi<AdminUser>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async chatFAQ(
    query: string,
    category?: string,
    topK: number = 3,
    conversationHistory?: ConversationMessage[]
  ): Promise<FAQChatResponse> {
    return this.request<FAQChatResponse>('/api/faq/chat', {
      method: 'POST',
      body: JSON.stringify({
        query,
        top_k: topK,
        category,
        conversation_history: conversationHistory || [],
      }),
    });
  }

  async getFAQStats(): Promise<FAQStats> {
    return this.request<FAQStats>('/api/faq/stats');
  }


  async getUserInputLogs(
    days: number = 7,
    logType?: string,
    limit: number = 100
  ): Promise<UserInputLogsResponse> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    params.append('limit', limit.toString());
    if (logType) {
      params.append('log_type', logType);
    }
    return this.request<UserInputLogsResponse>(`/api/admin/logs?${params.toString()}`);
  }

  async getLoginLogs(days: number = 7, limit: number = 100): Promise<LoginLogsResponse> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    params.append('limit', limit.toString());
    return this.request<LoginLogsResponse>(`/api/admin/login-logs?${params.toString()}`);
  }

  // 管理者ログインイベントを記録（バックエンドのS3/Athenaログに保存）
  async logAdminEvent(
    adminUserId: string,
    adminUsername: string,
    eventType: string = 'login'
  ): Promise<void> {
    try {
      await this.request('/api/admin/log-event', {
        method: 'POST',
        body: JSON.stringify({
          admin_user_id: adminUserId,
          admin_username: adminUsername,
          event_type: eventType,
        }),
      });
    } catch (error) {
      // ログ記録の失敗はユーザー体験に影響しないよう、エラーを無視
      console.warn('Failed to log admin event:', error);
    }
  }

  async getSettings(): Promise<SettingsResponse> {
    return this.request<SettingsResponse>('/api/settings');
  }

  async updateSettings(settings: UpdateSettingsRequest): Promise<SettingsResponse> {
    return this.request<SettingsResponse>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }


  // Operational Rules
  async getRules(includeDisabled: boolean = true): Promise<RulesListResponse> {
    const params = new URLSearchParams();
    params.append('include_disabled', includeDisabled.toString());
    return this.request<RulesListResponse>(`/api/rules?${params.toString()}`);
  }

  async getRule(ruleId: string): Promise<OperationalRule> {
    return this.request<OperationalRule>(`/api/rules/${ruleId}`);
  }

  async createRule(rule: CreateRuleRequest): Promise<OperationalRule> {
    return this.request<OperationalRule>('/api/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
  }

  async updateRule(ruleId: string, rule: UpdateRuleRequest): Promise<OperationalRule> {
    return this.request<OperationalRule>(`/api/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteRule(ruleId: string): Promise<void> {
    await this.request<void>(`/api/rules/${ruleId}`, {
      method: 'DELETE',
    });
  }

  async getRuleHistory(ruleId?: string, limit: number = 50): Promise<RuleHistoryResponse> {
    const params = new URLSearchParams();
    if (ruleId) params.append('rule_id', ruleId);
    params.append('limit', limit.toString());
    return this.request<RuleHistoryResponse>(`/api/rules/history?${params.toString()}`);
  }


  // Company Management (Admin)
  async getCompanies(): Promise<CompaniesResponse> {
    if (this.isMock) {
      const { mockCompaniesResponse } = await import('@/lib/mock');
      return mockCompaniesResponse;
    }
    return this.requestNextApi<CompaniesResponse>('/api/admin/companies');
  }

  async getCompany(id: string): Promise<Company> {
    if (this.isMock) {
      const { mockCompanies } = await import('@/lib/mock');
      const company = mockCompanies.find((c) => c.id === id);
      if (!company) throw new Error('Company not found');
      return company;
    }
    return this.requestNextApi<Company>(`/api/admin/companies/${id}`);
  }

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    if (this.isMock) {
      const { mockCompanies } = await import('@/lib/mock');
      return mockCompanies[0];
    }
    return this.requestNextApi<Company>('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
    if (this.isMock) {
      const { mockCompanies } = await import('@/lib/mock');
      return mockCompanies[0];
    }
    return this.requestNextApi<Company>(`/api/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<void>(`/api/admin/companies/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyUsers(companyId: string): Promise<CompanyUsersResponse> {
    if (this.isMock) {
      const { mockCompanyUsers } = await import('@/lib/mock');
      const filtered = mockCompanyUsers.filter((u) => u.companyId === companyId);
      return { users: filtered, total: filtered.length };
    }
    return this.requestNextApi<CompanyUsersResponse>(`/api/admin/companies/${companyId}/users`);
  }

  async createCompanyUser(companyId: string, data: CreateCompanyUserRequest): Promise<CompanyUser> {
    if (this.isMock) {
      const { mockCompanyUsers } = await import('@/lib/mock');
      return mockCompanyUsers[0];
    }
    return this.requestNextApi<CompanyUser>(`/api/admin/companies/${companyId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyUser(
    companyId: string,
    userId: string,
    data: UpdateCompanyUserRequest
  ): Promise<CompanyUser> {
    if (this.isMock) {
      const { mockCompanyUsers } = await import('@/lib/mock');
      return mockCompanyUsers[0];
    }
    return this.requestNextApi<CompanyUser>(`/api/admin/companies/${companyId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyUser(companyId: string, userId: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<void>(`/api/admin/companies/${companyId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Module Master CRUD
  async getModules(): Promise<CompanyModulesResponse> {
    if (this.isMock) {
      const { mockCompanyModules } = await import('@/lib/mock');
      return { modules: mockCompanyModules, total: mockCompanyModules.length };
    }
    return this.requestNextApi<CompanyModulesResponse>('/api/admin/modules');
  }

  async createModule(data: CreateCompanyModuleRequest): Promise<CompanyModule> {
    return this.requestNextApi<CompanyModule>('/api/admin/modules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModule(id: string, data: UpdateCompanyModuleRequest): Promise<CompanyModule> {
    return this.requestNextApi<CompanyModule>(`/api/admin/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteModule(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/admin/modules/${id}`, {
      method: 'DELETE',
    });
  }

  // Sidebar: companies with active modules
  async getCompaniesSidebar(): Promise<SidebarCompaniesResponse> {
    if (this.isMock) {
      const { mockSidebarCompaniesResponse } = await import('@/lib/mock');
      return mockSidebarCompaniesResponse;
    }
    return this.requestNextApi<SidebarCompaniesResponse>('/api/admin/companies/sidebar');
  }

  // Company Module Assignments
  async getCompanyModules(companyId: string): Promise<CompanyModuleAssignmentsResponse> {
    if (this.isMock) {
      const { mockCompanyModules } = await import('@/lib/mock');
      return {
        modules: mockCompanyModules.map((m) => ({ ...m, assigned: true, assignmentIsActive: true, config: null })),
      };
    }
    return this.requestNextApi<CompanyModuleAssignmentsResponse>(
      `/api/admin/companies/${companyId}/modules`
    );
  }

  async updateCompanyModules(
    companyId: string,
    data: BulkUpdateModuleAssignmentsRequest
  ): Promise<void> {
    await this.requestNextApi<void>(`/api/admin/companies/${companyId}/modules`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin: Company Documents (slug-based full CRUD)
  async getCompanyDocuments(
    companySlug: string,
    filters?: { tagId?: string; status?: string; limit?: number; offset?: number }
  ): Promise<DocumentsResponse> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      let filtered = [...mockDocuments];
      if (filters?.tagId) filtered = filtered.filter((d) => d.tags.some((t) => t.id === filters.tagId));
      if (filters?.status) filtered = filtered.filter((d) => d.status === filters.status);
      return { documents: filtered, total: filtered.length };
    }
    const params = new URLSearchParams();
    if (filters?.tagId) params.set('tagId', filters.tagId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<DocumentsResponse>(
      `/api/admin/c/${companySlug}/documents${qs ? `?${qs}` : ''}`
    );
  }

  async getCompanyDocument(companySlug: string, id: string): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      const d = mockDocuments.find((d) => d.id === id);
      if (!d) throw new Error('Document not found');
      return d;
    }
    return this.requestNextApi<DocumentItem>(`/api/admin/c/${companySlug}/documents/${id}`);
  }

  async uploadCompanyDocument(companySlug: string, file: File, title?: string, tagIds?: string[]): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      return mockDocuments[0];
    }
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tagIds && tagIds.length > 0) formData.append('tagIds', JSON.stringify(tagIds));
    return this.requestNextApiFormData<DocumentItem>(`/api/admin/c/${companySlug}/documents`, formData);
  }

  async updateCompanyDocument(companySlug: string, id: string, data: { title?: string; tagIds?: string[] }): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      return mockDocuments[0];
    }
    return this.requestNextApi<DocumentItem>(`/api/admin/c/${companySlug}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyDocument(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async chatCompanyDocuments(
    companySlug: string,
    query: string,
    conversationHistory: { role: string; content: string }[] = []
  ): Promise<DocumentChatResponse> {
    if (this.isMock) {
      return {
        answer: `「${query}」についてのモック回答です。実際の運用ではRAG検索結果に基づいた回答が返されます。`,
        sources: [],
        model: 'mock',
      };
    }
    return this.requestNextApi<DocumentChatResponse>(
      `/api/admin/c/${companySlug}/documents/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversationHistory }),
      }
    );
  }

  async searchCompanyDocuments(companySlug: string, query: string, limit?: number): Promise<DocumentSearchResponse> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      const q = query.toLowerCase();
      const matched = mockDocuments.filter((d) => d.title.toLowerCase().includes(q));
      return {
        results: matched.map((d) => ({ document: d, relevantChunks: [{ content: `${d.title}の関連コンテンツ`, score: 0.85 }], maxScore: 0.85 })),
        query,
      };
    }
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    return this.requestNextApi<DocumentSearchResponse>(`/api/admin/c/${companySlug}/documents/search?${params}`);
  }

  async getCompanyDocumentTags(companySlug: string): Promise<DocumentTagsResponse> {
    if (this.isMock) {
      const { mockDocumentTagsResponse } = await import('@/lib/mock');
      return mockDocumentTagsResponse;
    }
    return this.requestNextApi<DocumentTagsResponse>(`/api/admin/c/${companySlug}/documents/tags`);
  }

  async createCompanyDocumentTag(companySlug: string, data: { name: string; slug: string; color?: string }): Promise<DocumentTag> {
    if (this.isMock) {
      return { id: 'mock-tag', name: data.name, slug: data.slug, color: data.color || '#6B7280', documentCount: 0 };
    }
    return this.requestNextApi<DocumentTag>(`/api/admin/c/${companySlug}/documents/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyDocumentTag(companySlug: string, id: string, data: { name?: string; slug?: string; color?: string }): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyDocumentTag(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Company LLM Settings
  async getCompanyLlmSettings(companySlug: string): Promise<LlmSettingsResponse> {
    if (this.isMock) {
      const { mockLlmSettingsResponse } = await import('@/lib/mock');
      return mockLlmSettingsResponse;
    }
    return this.requestNextApi<LlmSettingsResponse>(`/api/admin/c/${companySlug}/settings`);
  }

  async updateCompanyLlmSettings(companySlug: string, data: UpdateLlmSettingsRequest): Promise<LlmSettingsResponse> {
    if (this.isMock) {
      const { mockLlmSettingsResponse } = await import('@/lib/mock');
      return mockLlmSettingsResponse;
    }
    return this.requestNextApi<LlmSettingsResponse>(`/api/admin/c/${companySlug}/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin: Company Masters - Customers
  async getCompanyCustomers(companySlug: string, filters?: { type?: string; q?: string; limit?: number; offset?: number }): Promise<CustomersResponse> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      let filtered = [...mockCustomers];
      if (filters?.type) filtered = filtered.filter((c) => c.customerType === filters.type || c.customerType === 'both');
      if (filters?.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)); }
      return { customers: filtered, total: filtered.length };
    }
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<CustomersResponse>(`/api/admin/c/${companySlug}/masters/customers${qs ? `?${qs}` : ''}`);
  }

  async getCompanyCustomer(companySlug: string, id: string): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      const c = mockCustomers.find((c) => c.id === id);
      if (!c) throw new Error('Customer not found');
      return c;
    }
    return this.requestNextApi<Customer>(`/api/admin/c/${companySlug}/masters/customers/${id}`);
  }

  async createCompanyCustomer(companySlug: string, data: CreateCustomerRequest): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      return mockCustomers[0];
    }
    return this.requestNextApi<Customer>(`/api/admin/c/${companySlug}/masters/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyCustomer(companySlug: string, id: string, data: UpdateCustomerRequest): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      return mockCustomers[0];
    }
    return this.requestNextApi<Customer>(`/api/admin/c/${companySlug}/masters/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyCustomer(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/masters/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async importCompanyCustomers(companySlug: string, file: File): Promise<CsvImportResult> {
    if (this.isMock) return { success: 0, failed: 0, errors: [] };
    const formData = new FormData();
    formData.append('file', file);
    return this.requestNextApiFormData<CsvImportResult>(`/api/admin/c/${companySlug}/masters/customers/import`, formData);
  }

  // Admin: Company Masters - Products
  async getCompanyProducts(companySlug: string, filters?: { categoryId?: string; q?: string; limit?: number; offset?: number }): Promise<ProductsResponse> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      let filtered = [...mockProducts];
      if (filters?.categoryId) filtered = filtered.filter((p) => p.categoryId === filters.categoryId);
      if (filters?.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)); }
      return { products: filtered, total: filtered.length };
    }
    const params = new URLSearchParams();
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<ProductsResponse>(`/api/admin/c/${companySlug}/masters/products${qs ? `?${qs}` : ''}`);
  }

  async getCompanyProduct(companySlug: string, id: string): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      const p = mockProducts.find((p) => p.id === id);
      if (!p) throw new Error('Product not found');
      return p;
    }
    return this.requestNextApi<Product>(`/api/admin/c/${companySlug}/masters/products/${id}`);
  }

  async createCompanyProduct(companySlug: string, data: CreateProductRequest): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      return mockProducts[0];
    }
    return this.requestNextApi<Product>(`/api/admin/c/${companySlug}/masters/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyProduct(companySlug: string, id: string, data: UpdateProductRequest): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      return mockProducts[0];
    }
    return this.requestNextApi<Product>(`/api/admin/c/${companySlug}/masters/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyProduct(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/masters/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importCompanyProducts(companySlug: string, file: File): Promise<CsvImportResult> {
    if (this.isMock) return { success: 0, failed: 0, errors: [] };
    const formData = new FormData();
    formData.append('file', file);
    return this.requestNextApiFormData<CsvImportResult>(`/api/admin/c/${companySlug}/masters/products/import`, formData);
  }

  // Admin: Company Masters - Product Categories
  async getCompanyProductCategories(companySlug: string): Promise<ProductCategoriesResponse> {
    if (this.isMock) {
      const { mockProductCategoriesResponse } = await import('@/lib/mock');
      return mockProductCategoriesResponse;
    }
    return this.requestNextApi<ProductCategoriesResponse>(`/api/admin/c/${companySlug}/masters/products/categories`);
  }

  async createCompanyProductCategory(companySlug: string, data: { name: string; slug: string }): Promise<ProductCategory> {
    if (this.isMock) {
      return { id: 'mock-cat', name: data.name, slug: data.slug, productCount: 0 };
    }
    return this.requestNextApi<ProductCategory>(`/api/admin/c/${companySlug}/masters/products/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyProductCategory(companySlug: string, id: string, data: { name?: string }): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/masters/products/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyProductCategory(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/masters/products/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin: Company Quotations
  private getMockQuotationStatusOverrides(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('mock-quotation-status') || '{}');
  }

  async getCompanyQuotations(companySlug: string, filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<QuotationsResponse> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      const overrides = this.getMockQuotationStatusOverrides();
      let filtered = mockQuotations.map((q) => overrides[q.id] ? { ...q, status: overrides[q.id] as Quotation['status'] } : q);
      if (filters?.customerId) filtered = filtered.filter((q) => q.customerId === filters.customerId);
      if (filters?.status) filtered = filtered.filter((q) => q.status === filters.status);
      if (filters?.q) { const query = filters.q.toLowerCase(); filtered = filtered.filter((q) => q.quotationNumber.toLowerCase().includes(query) || q.customer.name.toLowerCase().includes(query) || (q.subject && q.subject.toLowerCase().includes(query))); }
      const list = filtered.map(({ items: _items, ...rest }) => rest);
      return { quotations: list, total: list.length };
    }
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<QuotationsResponse>(`/api/admin/c/${companySlug}/quotations${qs ? `?${qs}` : ''}`);
  }

  async getCompanyQuotation(companySlug: string, id: string): Promise<Quotation> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      const overrides = this.getMockQuotationStatusOverrides();
      const q = mockQuotations.find((q) => q.id === id);
      if (!q) throw new Error('Quotation not found');
      if (overrides[id]) return { ...q, status: overrides[id] as Quotation['status'] };
      return q;
    }
    return this.requestNextApi<Quotation>(`/api/admin/c/${companySlug}/quotations/${id}`);
  }

  async createCompanyQuotation(companySlug: string, data: CreateQuotationRequest): Promise<Quotation> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      return mockQuotations[0];
    }
    return this.requestNextApi<Quotation>(`/api/admin/c/${companySlug}/quotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyQuotation(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/quotations/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCompanyQuotationStatus(companySlug: string, id: string, status: string): Promise<void> {
    if (this.isMock) {
      const overrides = this.getMockQuotationStatusOverrides();
      overrides[id] = status;
      localStorage.setItem('mock-quotation-status', JSON.stringify(overrides));
      return;
    }
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async convertCompanyQuotation(companySlug: string, id: string): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      return mockOrders[0];
    }
    return this.requestNextApi<Order>(`/api/admin/c/${companySlug}/quotations/${id}/convert`, {
      method: 'POST',
    });
  }

  async getCompanyQuotationSharedLinks(companySlug: string, id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    if (this.isMock) {
      const storageKey = `mock-shared-links-quotation-${id}`;
      const links = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return { links };
    }
    return this.requestNextApi<{ links: SharedLinkResponse['link'][] }>(`/api/admin/c/${companySlug}/quotations/${id}/share`);
  }

  async createCompanyQuotationSharedLink(companySlug: string, id: string, data?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = data?.expiresInDays || 14;
      const url = `${window.location.origin}/shared/${companySlug}/${token}`;
      const link = {
        id: `sl-${Date.now()}`,
        token,
        linkType: 'quotation' as const,
        targetId: id,
        expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
        isActive: true,
        canApprove: data?.canApprove || false,
        approvedAt: null,
        approvedByName: null,
        approvalComment: null,
        rejectedAt: null,
        rejectedByName: null,
        rejectionComment: null,
        createdByName: '管理者',
        createdAt: new Date().toISOString(),
      };
      const storageKey = `mock-shared-links-quotation-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url };
    }
    return this.requestNextApi<SharedLinkResponse>(`/api/admin/c/${companySlug}/quotations/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  getCompanyQuotationPdfUrl(companySlug: string, id: string): string {
    return `/api/admin/c/${companySlug}/quotations/${id}/pdf`;
  }

  // Admin: Company Orders
  async getCompanyOrders(companySlug: string, filters?: { customerId?: string; status?: string; orderType?: string; q?: string; limit?: number; offset?: number }): Promise<OrdersResponse> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      let filtered = [...mockOrders];
      if (filters?.customerId) filtered = filtered.filter((o) => o.customerId === filters.customerId);
      if (filters?.status) filtered = filtered.filter((o) => o.status === filters.status);
      if (filters?.orderType) filtered = filtered.filter((o) => o.orderType === filters.orderType);
      if (filters?.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q)); }
      const list = filtered.map(({ items: _items, ...rest }) => rest);
      return { orders: list, total: list.length };
    }
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.orderType) params.set('orderType', filters.orderType);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<OrdersResponse>(`/api/admin/c/${companySlug}/orders${qs ? `?${qs}` : ''}`);
  }

  async getCompanyOrder(companySlug: string, id: string): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      const order = mockOrders.find((o) => o.id === id);
      if (!order) throw new Error('Order not found');
      return order;
    }
    return this.requestNextApi<Order>(`/api/admin/c/${companySlug}/orders/${id}`);
  }

  async createCompanyOrder(companySlug: string, data: CreateOrderRequest): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      return mockOrders[0];
    }
    return this.requestNextApi<Order>(`/api/admin/c/${companySlug}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyOrder(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCompanyOrderStatus(companySlug: string, id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getCompanyOrderSharedLinks(companySlug: string, id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    if (this.isMock) {
      const links = JSON.parse(localStorage.getItem(`mock-shared-links-order-${id}`) || '[]');
      return { links };
    }
    return this.requestNextApi<{ links: SharedLinkResponse['link'][] }>(`/api/admin/c/${companySlug}/orders/${id}/share`);
  }

  async createCompanyOrderSharedLink(companySlug: string, id: string, data?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = data?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'order' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: data?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: '管理者', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-order-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${companySlug}/${token}` };
    }
    return this.requestNextApi<SharedLinkResponse>(`/api/admin/c/${companySlug}/orders/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // Admin: Company OCR
  async getCompanyOcrExtractions(companySlug: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<OcrExtractionsResponse> {
    if (this.isMock) return { extractions: [], total: 0 };
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<OcrExtractionsResponse>(`/api/admin/c/${companySlug}/orders/ocr${qs ? `?${qs}` : ''}`);
  }

  async getCompanyOcrExtraction(companySlug: string, id: string): Promise<OcrExtraction> {
    if (this.isMock) {
      return { id, imageUrl: '', sourceType: 'fax', status: 'pending', extractedData: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as OcrExtraction;
    }
    return this.requestNextApi<OcrExtraction>(`/api/admin/c/${companySlug}/orders/ocr/${id}`);
  }

  async uploadCompanyOcrImage(companySlug: string, file: File, sourceType?: string): Promise<OcrExtraction> {
    if (this.isMock) {
      return { id: 'mock-ocr', imageUrl: '', sourceType: sourceType || 'fax', status: 'pending', extractedData: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as OcrExtraction;
    }
    const formData = new FormData();
    formData.append('file', file);
    if (sourceType) formData.append('sourceType', sourceType);
    return this.requestNextApiFormData<OcrExtraction>(`/api/admin/c/${companySlug}/orders/ocr`, formData);
  }

  async updateCompanyOcrExtraction(companySlug: string, id: string, data: UpdateOcrExtractionRequest): Promise<OcrExtraction> {
    if (this.isMock) {
      return { id, imageUrl: '', sourceType: 'fax', status: 'reviewed', extractedData: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as OcrExtraction;
    }
    return this.requestNextApi<OcrExtraction>(`/api/admin/c/${companySlug}/orders/ocr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async convertCompanyOcrToOrder(companySlug: string, id: string): Promise<{ orderId: string; orderNumber: string }> {
    if (this.isMock) return { orderId: 'mock-order', orderNumber: 'ORD-MOCK-001' };
    return this.requestNextApi<{ orderId: string; orderNumber: string }>(`/api/admin/c/${companySlug}/orders/ocr/${id}/convert`, {
      method: 'POST',
    });
  }

  // Admin: Company Delivery Notes
  async getCompanyDeliveryNotes(companySlug: string, filters?: { customerId?: string; orderId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<DeliveryNotesResponse> {
    if (this.isMock) {
      const { mockDeliveryNotes } = await import('@/lib/mock');
      let filtered = [...mockDeliveryNotes];
      if (filters?.customerId) filtered = filtered.filter((d) => d.customerId === filters.customerId);
      if (filters?.orderId) filtered = filtered.filter((d) => d.orderId === filters.orderId);
      if (filters?.status) filtered = filtered.filter((d) => d.status === filters.status);
      if (filters?.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter((d) => d.deliveryNumber.toLowerCase().includes(q) || d.customer.name.toLowerCase().includes(q)); }
      const list = filtered.map(({ items: _items, ...rest }) => rest);
      return { deliveryNotes: list, total: list.length };
    }
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.orderId) params.set('orderId', filters.orderId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<DeliveryNotesResponse>(`/api/admin/c/${companySlug}/delivery-notes${qs ? `?${qs}` : ''}`);
  }

  async getCompanyDeliveryNote(companySlug: string, id: string): Promise<DeliveryNote> {
    if (this.isMock) {
      const { mockDeliveryNotes } = await import('@/lib/mock');
      const found = mockDeliveryNotes.find((d) => d.id === id);
      if (found) return found;
      return mockDeliveryNotes[0];
    }
    return this.requestNextApi<DeliveryNote>(`/api/admin/c/${companySlug}/delivery-notes/${id}`);
  }

  async createCompanyDeliveryNote(companySlug: string, data: { orderId: string; deliveryDate?: string }): Promise<DeliveryNote> {
    if (this.isMock) {
      const { mockDeliveryNotes } = await import('@/lib/mock');
      return mockDeliveryNotes[0];
    }
    return this.requestNextApi<DeliveryNote>(`/api/admin/c/${companySlug}/delivery-notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyDeliveryNote(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/delivery-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCompanyDeliveryNoteStatus(companySlug: string, id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/delivery-notes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getCompanyDeliveryNoteSharedLinks(companySlug: string, id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    if (this.isMock) {
      const links = JSON.parse(localStorage.getItem(`mock-shared-links-delivery_note-${id}`) || '[]');
      return { links };
    }
    return this.requestNextApi<{ links: SharedLinkResponse['link'][] }>(`/api/admin/c/${companySlug}/delivery-notes/${id}/share`);
  }

  async createCompanyDeliveryNoteSharedLink(companySlug: string, id: string, data?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = data?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'delivery_note' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: data?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: '管理者', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-delivery_note-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${companySlug}/${token}` };
    }
    return this.requestNextApi<SharedLinkResponse>(`/api/admin/c/${companySlug}/delivery-notes/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // Admin: Company Invoices
  async getCompanyInvoices(companySlug: string, filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<InvoicesResponse> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      let filtered = [...mockInvoices];
      if (filters?.status) filtered = filtered.filter((inv) => inv.status === filters.status);
      if (filters?.q) {
        const q = filters.q.toLowerCase();
        filtered = filtered.filter((inv) => inv.invoiceNumber.toLowerCase().includes(q) || inv.customer.name.toLowerCase().includes(q));
      }
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 20;
      return { invoices: filtered.slice(offset, offset + limit), total: filtered.length };
    }
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.requestNextApi<InvoicesResponse>(`/api/admin/c/${companySlug}/invoices${qs ? `?${qs}` : ''}`);
  }

  async getCompanyInvoice(companySlug: string, id: string): Promise<Invoice> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      const found = mockInvoices.find((inv) => inv.id === id);
      return found || mockInvoices[0];
    }
    return this.requestNextApi<Invoice>(`/api/admin/c/${companySlug}/invoices/${id}`);
  }

  async createCompanyInvoice(companySlug: string, data: { customerId: string; deliveryNoteIds: string[]; invoiceDate: string; dueDate: string; notes?: string }): Promise<Invoice> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      return mockInvoices[0];
    }
    return this.requestNextApi<Invoice>(`/api/admin/c/${companySlug}/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyInvoice(companySlug: string, id: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async updateCompanyInvoiceStatus(companySlug: string, id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async addCompanyInvoicePayment(companySlug: string, id: string, data: { paymentDate: string; amount: number; paymentMethod?: string; reference?: string; notes?: string }): Promise<void> {
    if (this.isMock) return;
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompanyInvoiceSharedLinks(companySlug: string, id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    if (this.isMock) {
      const links = JSON.parse(localStorage.getItem(`mock-shared-links-invoice-${id}`) || '[]');
      return { links };
    }
    return this.requestNextApi<{ links: SharedLinkResponse['link'][] }>(`/api/admin/c/${companySlug}/invoices/${id}/share`);
  }

  async createCompanyInvoiceSharedLink(companySlug: string, id: string, data?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = data?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'invoice' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: data?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: '管理者', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-invoice-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${companySlug}/${token}` };
    }
    return this.requestNextApi<SharedLinkResponse>(`/api/admin/c/${companySlug}/invoices/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  // Admin: Company Dashboard
  async getCompanyDashboardSummary(companySlug: string): Promise<{ summary: DashboardSummary; recentOrders: RecentOrder[]; statusDistribution: OrderStatusCount[] }> {
    if (this.isMock) {
      const { mockDashboardSummaryResponse } = await import('@/lib/mock');
      return mockDashboardSummaryResponse;
    }
    return this.requestNextApi(`/api/admin/c/${companySlug}/dashboard`);
  }

  async getCompanyDashboardSales(companySlug: string, year?: number, month?: number): Promise<DashboardSalesResponse> {
    if (this.isMock) {
      const { mockDashboardSalesResponse } = await import('@/lib/mock');
      return mockDashboardSalesResponse;
    }
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const qs = params.toString();
    return this.requestNextApi(`/api/admin/c/${companySlug}/dashboard/sales${qs ? `?${qs}` : ''}`);
  }

  async getCompanyDashboardRankings(companySlug: string, limit?: number): Promise<DashboardRankingsResponse> {
    if (this.isMock) {
      const { mockDashboardRankingsResponse } = await import('@/lib/mock');
      return mockDashboardRankingsResponse;
    }
    const qs = limit ? `?limit=${limit}` : '';
    return this.requestNextApi(`/api/admin/c/${companySlug}/dashboard/rankings${qs}`);
  }

  async getCompanyDashboardReceivables(companySlug: string): Promise<{ receivables: Receivable[] }> {
    if (this.isMock) {
      const { mockDashboardReceivablesResponse } = await import('@/lib/mock');
      return mockDashboardReceivablesResponse;
    }
    return this.requestNextApi(`/api/admin/c/${companySlug}/dashboard/receivables`);
  }

  async getCompanyDashboardAiAnalysis(companySlug: string, refresh?: boolean): Promise<AiAnalysisResult> {
    if (this.isMock) {
      return { analysis: 'モックモードのため、AI分析は利用できません。', generatedAt: new Date().toISOString(), dataRange: { from: '2025-04-01', to: '2026-03-10' } };
    }
    const qs = refresh ? '?refresh=true' : '';
    return this.requestNextApi<AiAnalysisResult>(`/api/admin/c/${companySlug}/dashboard/ai-analysis${qs}`);
  }

  // Admin: Company Suggestions
  async getCompanySuggestions(companySlug: string): Promise<AutoSuggestionsResponse> {
    if (this.isMock) return { suggestions: [] };
    return this.requestNextApi<AutoSuggestionsResponse>(`/api/admin/c/${companySlug}/suggestions`);
  }

  async getCompanyOrderSuggestions(companySlug: string, customerId: string): Promise<OrderSuggestionsResponse> {
    if (this.isMock) return { suggestion: null };
    return this.requestNextApi<OrderSuggestionsResponse>(`/api/admin/c/${companySlug}/orders/suggestions?customerId=${customerId}`);
  }

  // Python バックエンド向けリクエスト（Basic Auth のみ使用）
  private async request<T>(
    path: string,
    options: RequestInit = {},
    retried: boolean = false
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Basic-Auth': BASIC_AUTH_HEADER,
    };

    // ユーザー名をヘッダーに追加（ログ記録用）
    if (this.currentUser?.username) {
      (headers as Record<string, string>)['X-User-Name'] = this.currentUser.username;
    }

    // 管理者ユーザー情報をヘッダーに追加（チャットログ記録用）
    if (this.currentUser?.id) {
      (headers as Record<string, string>)['X-Admin-User-Id'] = this.currentUser.id;
    }
    if (this.currentUser?.username) {
      (headers as Record<string, string>)['X-Admin-Username'] = this.currentUser.username;
    }

    const res = await fetch(`${PYTHON_API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // 401エラーの場合、トークンをリフレッシュして再試行
    if (res.status === 401 && !retried) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(path, options, true);
      }
      // リフレッシュ失敗時はログインページへ
      this.handleSessionExpired();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Next.js API向けリクエスト（JWT Auth使用）
  private async requestNextApi<T>(
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

    // 401エラーの場合、トークンをリフレッシュして再試行
    if (res.status === 401 && !retried) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.requestNextApi<T>(path, options, true);
      }
      // リフレッシュ失敗時はログインページへ
      this.handleSessionExpired();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }

    return res.json();
  }
  private async requestNextApiFormData<T>(
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
        return this.requestNextApiFormData<T>(path, formData, true);
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

export const api = new ApiClient();
