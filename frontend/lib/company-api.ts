import type {
  CompanyLoginResponse,
  CompanyModuleAssignment,
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
  UpdateQuotationRequest,
  UpdateQuotationRequest,
  SharedLinkResponse,
  OrdersResponse,
  Order,
  CreateOrderRequest,
  DeliveryNotesResponse,
  DeliveryNote,
  InvoicesResponse,
  Invoice,
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

  private get isMock(): boolean {
    return process.env.NEXT_PUBLIC_AUTH_MOCK === 'true';
  }

  private getAuthEndpoint(action: string): string {
    if (this.isMock) return `/mock-auth/company/${action}`;
    return `/api/company/auth/${action}`;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCompanySlug(): string {
    if (this.companySlug) return this.companySlug;
    if (typeof window !== 'undefined') {
      // /company/{slug}/... or /admin/c/{slug}/...
      const match = window.location.pathname.match(/\/company\/([^/]+)/) ||
                    window.location.pathname.match(/\/admin\/c\/([^/]+)/);
      if (match) return match[1];
    }
    return 'unknown';
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
    const res = await fetch(this.getAuthEndpoint('login'), {
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
    const res = await fetch(this.getAuthEndpoint('refresh'), {
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
    await fetch(this.getAuthEndpoint('logout'), {
      method: 'POST',
      credentials: 'include',
    });
    this.accessToken = null;
    this.currentUser = null;
    this.companySlug = null;
  }

  async getMe(): Promise<CompanyCurrentUser> {
    const data = await this.request<{ user: CompanyCurrentUser }>(this.getAuthEndpoint('me'));
    this.currentUser = data.user;
    this.companySlug = data.user.company.slug;
    return data.user;
  }

  async getModules(): Promise<CompanyModuleAssignment[]> {
    if (this.isMock) {
      const { mockYagichuModuleAssignments } = await import('@/lib/mock');
      return mockYagichuModuleAssignments;
    }
    const data = await this.request<{ modules: CompanyModuleAssignment[] }>('/api/company/modules');
    return data.modules;
  }

  // ---------- Documents ----------

  async getDocuments(filters?: { tagId?: string; status?: string; limit?: number; offset?: number }): Promise<DocumentsResponse> {
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
    return this.request<DocumentsResponse>(`/api/company/modules/documents${qs ? `?${qs}` : ''}`);
  }

  async getDocument(id: string): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      const d = mockDocuments.find((d) => d.id === id);
      if (!d) throw new Error('Document not found');
      return d;
    }
    return this.request<DocumentItem>(`/api/company/modules/documents/${id}`);
  }

  async uploadDocument(file: File, title?: string, tagIds?: string[]): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      return mockDocuments[0];
    }
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tagIds && tagIds.length > 0) formData.append('tagIds', JSON.stringify(tagIds));
    return this.requestFormData<DocumentItem>('/api/company/modules/documents', formData);
  }

  async updateDocument(id: string, data: { title?: string; tagIds?: string[] }): Promise<DocumentItem> {
    if (this.isMock) {
      const { mockDocuments } = await import('@/lib/mock');
      return mockDocuments[0];
    }
    return this.request<DocumentItem>(`/api/company/modules/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async chatDocuments(
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
    return this.request<DocumentChatResponse>(
      '/api/company/modules/documents/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, conversationHistory }),
      }
    );
  }

  async searchDocuments(query: string, limit?: number): Promise<DocumentSearchResponse> {
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
    return this.request<DocumentSearchResponse>(`/api/company/modules/documents/search?${params}`);
  }

  // ---------- Document Tags ----------

  async getDocumentTags(): Promise<DocumentTagsResponse> {
    if (this.isMock) {
      const { mockDocumentTagsResponse } = await import('@/lib/mock');
      return mockDocumentTagsResponse;
    }
    return this.request<DocumentTagsResponse>('/api/company/modules/documents/tags');
  }

  async createDocumentTag(data: { name: string; slug: string; color?: string }): Promise<DocumentTag> {
    if (this.isMock) {
      return { id: 'mock-tag', name: data.name, slug: data.slug, color: data.color || '#6B7280', documentCount: 0 };
    }
    return this.request<DocumentTag>('/api/company/modules/documents/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocumentTag(id: string, data: { name?: string; slug?: string; color?: string }): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/documents/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocumentTag(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/documents/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // ---------- Masters - Customers ----------

  async getCustomers(filters?: { type?: string; q?: string; limit?: number; offset?: number }): Promise<CustomersResponse> {
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
    return this.request<CustomersResponse>(`/api/company/modules/masters/customers${qs ? `?${qs}` : ''}`);
  }

  async getCustomer(id: string): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      const c = mockCustomers.find((c) => c.id === id);
      if (!c) throw new Error('Customer not found');
      return c;
    }
    return this.request<Customer>(`/api/company/modules/masters/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      return mockCustomers[0];
    }
    return this.request<Customer>('/api/company/modules/masters/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    if (this.isMock) {
      const { mockCustomers } = await import('@/lib/mock');
      return mockCustomers[0];
    }
    return this.request<Customer>(`/api/company/modules/masters/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/masters/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async importCustomers(file: File): Promise<CsvImportResult> {
    if (this.isMock) return { success: 0, failed: 0, errors: [] };
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<CsvImportResult>('/api/company/modules/masters/customers/import', formData);
  }

  // ---------- Masters - Products ----------

  async getProducts(filters?: { categoryId?: string; q?: string; limit?: number; offset?: number }): Promise<ProductsResponse> {
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
    return this.request<ProductsResponse>(`/api/company/modules/masters/products${qs ? `?${qs}` : ''}`);
  }

  async getProduct(id: string): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      const p = mockProducts.find((p) => p.id === id);
      if (!p) throw new Error('Product not found');
      return p;
    }
    return this.request<Product>(`/api/company/modules/masters/products/${id}`);
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      return mockProducts[0];
    }
    return this.request<Product>('/api/company/modules/masters/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    if (this.isMock) {
      const { mockProducts } = await import('@/lib/mock');
      return mockProducts[0];
    }
    return this.request<Product>(`/api/company/modules/masters/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importProducts(file: File): Promise<CsvImportResult> {
    if (this.isMock) return { success: 0, failed: 0, errors: [] };
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<CsvImportResult>('/api/company/modules/masters/products/import', formData);
  }

  // ---------- Masters - Product Categories ----------

  async getProductCategories(): Promise<ProductCategoriesResponse> {
    if (this.isMock) {
      const { mockProductCategoriesResponse } = await import('@/lib/mock');
      return mockProductCategoriesResponse;
    }
    return this.request<ProductCategoriesResponse>('/api/company/modules/masters/products/categories');
  }

  async createProductCategory(data: { name: string; slug: string }): Promise<ProductCategory> {
    if (this.isMock) {
      return { id: 'mock-cat', name: data.name, slug: data.slug, productCount: 0 };
    }
    return this.request<ProductCategory>('/api/company/modules/masters/products/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProductCategory(id: string, data: { name?: string }): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProductCategory(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ---------- Quotations ----------

  private getMockStatusOverrides(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('mock-quotation-status') || '{}');
  }

  async getQuotations(filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<QuotationsResponse> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      const overrides = this.getMockStatusOverrides();
      let filtered = mockQuotations.map((q) => overrides[q.id] ? { ...q, status: overrides[q.id] as Quotation['status'] } : q);
      if (filters?.customerId) filtered = filtered.filter((q) => q.customerId === filters.customerId);
      if (filters?.status) filtered = filtered.filter((q) => q.status === filters.status);
      if (filters?.q) { const query = filters.q.toLowerCase(); filtered = filtered.filter((q) => q.quotationNumber.toLowerCase().includes(query) || q.customer.name.toLowerCase().includes(query)); }
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
    return this.request<QuotationsResponse>(`/api/company/modules/quotations${qs ? `?${qs}` : ''}`);
  }

  async getQuotation(id: string): Promise<Quotation> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      const overrides = this.getMockStatusOverrides();
      const q = mockQuotations.find((q) => q.id === id);
      if (!q) throw new Error('Quotation not found');
      if (overrides[id]) return { ...q, status: overrides[id] as Quotation['status'] };
      return q;
    }
    return this.request<Quotation>(`/api/company/modules/quotations/${id}`);
  }

  async createQuotation(data: CreateQuotationRequest): Promise<Quotation> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      return mockQuotations[0];
    }
    return this.request<Quotation>('/api/company/modules/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuotation(id: string, data: UpdateQuotationRequest): Promise<Quotation> {
    if (this.isMock) {
      const { mockQuotations } = await import('@/lib/mock');
      return mockQuotations[0];
    }
    return this.request<Quotation>(`/api/company/modules/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateQuotationStatus(id: string, status: string): Promise<void> {
    if (this.isMock) {
      // mockステータスをlocalStorageに保存
      const overrides = JSON.parse(localStorage.getItem('mock-quotation-status') || '{}');
      overrides[id] = status;
      localStorage.setItem('mock-quotation-status', JSON.stringify(overrides));
      return;
    }
    await this.request<{ success: boolean }>(`/api/company/modules/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteQuotation(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/quotations/${id}`, {
      method: 'DELETE',
    });
  }

  async shareQuotation(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = opts?.expiresInDays || 14;
      const url = `${window.location.origin}/shared/${this.getCompanySlug()}/${token}`;
      const link = {
        id: `sl-${Date.now()}`,
        token,
        linkType: 'quotation' as const,
        targetId: id,
        expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
        isActive: true,
        canApprove: opts?.canApprove || false,
        approvedAt: null,
        approvedByName: null,
        approvalComment: null,
        rejectedAt: null,
        rejectedByName: null,
        rejectionComment: null,
        createdByName: 'モックユーザー',
        createdAt: new Date().toISOString(),
      };
      // モック用：発行済みリンクをlocalStorageに保存
      const storageKey = `mock-shared-links-quotation-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url };
    }
    return this.request<SharedLinkResponse>(`/api/company/modules/quotations/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  async getQuotationSharedLinks(id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    if (this.isMock) {
      const storageKey = `mock-shared-links-quotation-${id}`;
      const links = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return { links };
    }
    return this.request<{ links: SharedLinkResponse['link'][] }>(`/api/company/modules/quotations/${id}/share`);
  }

  async convertQuotationToOrder(id: string): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      return mockOrders[0];
    }
    return this.request<Order>(`/api/company/modules/quotations/${id}/convert`, {
      method: 'POST',
    });
  }

  getQuotationPdfUrl(id: string): string {
    return `/api/company/modules/quotations/${id}/pdf`;
  }

  // ---------- Orders ----------

  async getOrders(filters?: { customerId?: string; status?: string; orderType?: string; q?: string; limit?: number; offset?: number }): Promise<OrdersResponse> {
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
    return this.request<OrdersResponse>(`/api/company/modules/orders${qs ? `?${qs}` : ''}`);
  }

  async getOrder(id: string): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      const o = mockOrders.find((o) => o.id === id);
      if (!o) throw new Error('Order not found');
      return o;
    }
    return this.request<Order>(`/api/company/modules/orders/${id}`);
  }

  async createOrder(data: CreateOrderRequest): Promise<Order> {
    if (this.isMock) {
      const { mockOrders } = await import('@/lib/mock');
      return mockOrders[0];
    }
    return this.request<Order>('/api/company/modules/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteOrder(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async shareOrder(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = opts?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'order' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: opts?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: 'モックユーザー', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-order-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${this.getCompanySlug()}/${token}` };
    }
    return this.request<SharedLinkResponse>(`/api/company/modules/orders/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- OCR ----------

  async getOcrExtractions(filters?: { status?: string; limit?: number; offset?: number }): Promise<OcrExtractionsResponse> {
    if (this.isMock) {
      const { mockOcrExtractions } = await import('@/lib/mock');
      let filtered = [...mockOcrExtractions];
      if (filters?.status) filtered = filtered.filter((e) => e.status === filters.status);
      return { extractions: filtered, total: filtered.length };
    }
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<OcrExtractionsResponse>(`/api/company/modules/orders/ocr${qs ? `?${qs}` : ''}`);
  }

  async getOcrExtraction(id: string): Promise<OcrExtraction> {
    if (this.isMock) {
      const { mockOcrExtractions } = await import('@/lib/mock');
      const e = mockOcrExtractions.find((e) => e.id === id);
      if (!e) throw new Error('OCR extraction not found');
      return e;
    }
    return this.request<OcrExtraction>(`/api/company/modules/orders/ocr/${id}`);
  }

  async uploadOcrImage(file: File, sourceType?: string): Promise<OcrExtraction> {
    if (this.isMock) {
      return { id: 'mock-ocr', imageUrl: '', sourceType: sourceType || 'fax', status: 'pending', extractedData: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as OcrExtraction;
    }
    const formData = new FormData();
    formData.append('file', file);
    if (sourceType) formData.append('sourceType', sourceType);
    return this.requestFormData<OcrExtraction>('/api/company/modules/orders/ocr', formData);
  }

  async updateOcrExtraction(id: string, data: UpdateOcrExtractionRequest): Promise<OcrExtraction> {
    if (this.isMock) {
      return { id, imageUrl: '', sourceType: 'fax', status: 'reviewed', extractedData: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as OcrExtraction;
    }
    return this.request<OcrExtraction>(`/api/company/modules/orders/ocr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async convertOcrToOrder(id: string): Promise<{ orderId: string; orderNumber: string }> {
    if (this.isMock) return { orderId: 'mock-order', orderNumber: 'ORD-MOCK-001' };
    return this.request<{ orderId: string; orderNumber: string }>(`/api/company/modules/orders/ocr/${id}/convert`, {
      method: 'POST',
    });
  }

  // ---------- Delivery Notes ----------

  async getDeliveryNotes(filters?: { customerId?: string; orderId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<DeliveryNotesResponse> {
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
    return this.request<DeliveryNotesResponse>(`/api/company/modules/delivery-notes${qs ? `?${qs}` : ''}`);
  }

  async getDeliveryNote(id: string): Promise<DeliveryNote> {
    if (this.isMock) {
      const { mockDeliveryNotes } = await import('@/lib/mock');
      const d = mockDeliveryNotes.find((d) => d.id === id);
      if (!d) throw new Error('Delivery note not found');
      return d;
    }
    return this.request<DeliveryNote>(`/api/company/modules/delivery-notes/${id}`);
  }

  async createDeliveryNoteFromOrder(orderId: string, deliveryDate?: string): Promise<DeliveryNote> {
    if (this.isMock) {
      const { mockDeliveryNotes } = await import('@/lib/mock');
      return mockDeliveryNotes[0];
    }
    return this.request<DeliveryNote>('/api/company/modules/delivery-notes', {
      method: 'POST',
      body: JSON.stringify({ orderId, deliveryDate }),
    });
  }

  async updateDeliveryNoteStatus(id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/delivery-notes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteDeliveryNote(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/delivery-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async shareDeliveryNote(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = opts?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'delivery_note' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: opts?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: 'モックユーザー', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-delivery_note-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${this.getCompanySlug()}/${token}` };
    }
    return this.request<SharedLinkResponse>(`/api/company/modules/delivery-notes/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- Invoices ----------

  async getInvoices(filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<InvoicesResponse> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      let filtered = [...mockInvoices];
      if (filters?.customerId) filtered = filtered.filter((i) => i.customerId === filters.customerId);
      if (filters?.status) filtered = filtered.filter((i) => i.status === filters.status);
      if (filters?.q) { const q = filters.q.toLowerCase(); filtered = filtered.filter((i) => i.invoiceNumber.toLowerCase().includes(q) || i.customer.name.toLowerCase().includes(q)); }
      const list = filtered.map(({ items: _items, payments: _payments, ...rest }) => rest);
      return { invoices: list, total: list.length };
    }
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<InvoicesResponse>(`/api/company/modules/invoices${qs ? `?${qs}` : ''}`);
  }

  async getInvoice(id: string): Promise<Invoice> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      const i = mockInvoices.find((i) => i.id === id);
      if (!i) throw new Error('Invoice not found');
      return i;
    }
    return this.request<Invoice>(`/api/company/modules/invoices/${id}`);
  }

  async createInvoice(data: { customerId: string; deliveryNoteIds: string[]; invoiceDate: string; dueDate: string; notes?: string }): Promise<Invoice> {
    if (this.isMock) {
      const { mockInvoices } = await import('@/lib/mock');
      return mockInvoices[0];
    }
    return this.request<Invoice>('/api/company/modules/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async addPayment(invoiceId: string, data: { paymentDate: string; amount: number; paymentMethod?: string; reference?: string; notes?: string }): Promise<void> {
    if (this.isMock) return;
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async shareInvoice(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    if (this.isMock) {
      const token = `mock-${Date.now().toString(36)}`;
      const days = opts?.expiresInDays || 14;
      const link = { id: `sl-${Date.now()}`, token, linkType: 'invoice' as const, targetId: id, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), isActive: true, canApprove: opts?.canApprove || false, approvedAt: null, approvedByName: null, approvalComment: null, rejectedAt: null, rejectedByName: null, rejectionComment: null, createdByName: 'モックユーザー', createdAt: new Date().toISOString() };
      const storageKey = `mock-shared-links-invoice-${id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.push(link);
      localStorage.setItem(storageKey, JSON.stringify(existing));
      return { link, url: `${window.location.origin}/shared/${this.getCompanySlug()}/${token}` };
    }
    return this.request<SharedLinkResponse>(`/api/company/modules/invoices/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- Dashboard ----------

  async getDashboardSummary(): Promise<{ summary: DashboardSummary; recentOrders: RecentOrder[]; statusDistribution: OrderStatusCount[] }> {
    if (this.isMock) {
      const { mockDashboardSummaryResponse } = await import('@/lib/mock');
      return mockDashboardSummaryResponse;
    }
    return this.request('/api/company/modules/dashboard');
  }

  async getDashboardSales(year?: number, month?: number): Promise<DashboardSalesResponse> {
    if (this.isMock) {
      const { mockDashboardSalesResponse } = await import('@/lib/mock');
      return mockDashboardSalesResponse;
    }
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const qs = params.toString();
    return this.request(`/api/company/modules/dashboard/sales${qs ? `?${qs}` : ''}`);
  }

  async getDashboardRankings(limit?: number): Promise<DashboardRankingsResponse> {
    if (this.isMock) {
      const { mockDashboardRankingsResponse } = await import('@/lib/mock');
      return mockDashboardRankingsResponse;
    }
    const qs = limit ? `?limit=${limit}` : '';
    return this.request(`/api/company/modules/dashboard/rankings${qs}`);
  }

  async getDashboardReceivables(): Promise<{ receivables: Receivable[] }> {
    if (this.isMock) {
      const { mockDashboardReceivablesResponse } = await import('@/lib/mock');
      return mockDashboardReceivablesResponse;
    }
    return this.request('/api/company/modules/dashboard/receivables');
  }

  async getDashboardAiAnalysis(refresh?: boolean): Promise<AiAnalysisResult> {
    if (this.isMock) {
      const { mockAiAnalysisResult } = await import('@/lib/mock');
      return mockAiAnalysisResult;
    }
    const qs = refresh ? '?refresh=true' : '';
    return this.request<AiAnalysisResult>(`/api/company/modules/dashboard/ai-analysis${qs}`);
  }

  // ---------- Suggestions ----------

  async getSuggestions(): Promise<AutoSuggestionsResponse> {
    if (this.isMock) {
      const { mockAutoSuggestionsResponse } = await import('@/lib/mock');
      return mockAutoSuggestionsResponse;
    }
    return this.request<AutoSuggestionsResponse>('/api/company/modules/suggestions');
  }

  async getOrderSuggestions(customerId: string): Promise<OrderSuggestionsResponse> {
    if (this.isMock) {
      const { mockOrderSuggestionsResponse } = await import('@/lib/mock');
      return { suggestion: mockOrderSuggestionsResponse.suggestion?.customerId === customerId ? mockOrderSuggestionsResponse.suggestion : null };
    }
    return this.request<OrderSuggestionsResponse>(`/api/company/modules/orders/suggestions?customerId=${customerId}`);
  }

  // ---------- LLM Settings ----------

  async getLlmSettings(): Promise<LlmSettingsResponse> {
    if (this.isMock) {
      const { mockLlmSettingsResponse } = await import('@/lib/mock');
      return mockLlmSettingsResponse;
    }
    return this.request<LlmSettingsResponse>('/api/company/modules/settings');
  }

  async updateLlmSettings(data: UpdateLlmSettingsRequest): Promise<LlmSettingsResponse> {
    if (this.isMock) {
      const { mockLlmSettingsResponse } = await import('@/lib/mock');
      return mockLlmSettingsResponse;
    }
    return this.request<LlmSettingsResponse>('/api/company/modules/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
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
