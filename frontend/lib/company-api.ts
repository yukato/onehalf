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

  async chatDocuments(
    query: string,
    conversationHistory: { role: string; content: string }[] = []
  ): Promise<DocumentChatResponse> {
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

  // ---------- Masters - Customers ----------

  async getCustomers(filters?: { type?: string; q?: string; limit?: number; offset?: number }): Promise<CustomersResponse> {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<CustomersResponse>(`/api/company/modules/masters/customers${qs ? `?${qs}` : ''}`);
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request<Customer>(`/api/company/modules/masters/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    return this.request<Customer>('/api/company/modules/masters/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    return this.request<Customer>(`/api/company/modules/masters/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/masters/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async importCustomers(file: File): Promise<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<CsvImportResult>('/api/company/modules/masters/customers/import', formData);
  }

  // ---------- Masters - Products ----------

  async getProducts(filters?: { categoryId?: string; q?: string; limit?: number; offset?: number }): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<ProductsResponse>(`/api/company/modules/masters/products${qs ? `?${qs}` : ''}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/api/company/modules/masters/products/${id}`);
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    return this.request<Product>('/api/company/modules/masters/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    return this.request<Product>(`/api/company/modules/masters/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/${id}`, {
      method: 'DELETE',
    });
  }

  async importProducts(file: File): Promise<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<CsvImportResult>('/api/company/modules/masters/products/import', formData);
  }

  // ---------- Masters - Product Categories ----------

  async getProductCategories(): Promise<ProductCategoriesResponse> {
    return this.request<ProductCategoriesResponse>('/api/company/modules/masters/products/categories');
  }

  async createProductCategory(data: { name: string; slug: string }): Promise<ProductCategory> {
    return this.request<ProductCategory>('/api/company/modules/masters/products/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProductCategory(id: string, data: { name?: string }): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProductCategory(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/masters/products/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ---------- Quotations ----------

  async getQuotations(filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<QuotationsResponse> {
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
    return this.request<Quotation>(`/api/company/modules/quotations/${id}`);
  }

  async createQuotation(data: CreateQuotationRequest): Promise<Quotation> {
    return this.request<Quotation>('/api/company/modules/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuotationStatus(id: string, status: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteQuotation(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/quotations/${id}`, {
      method: 'DELETE',
    });
  }

  async shareQuotation(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    return this.request<SharedLinkResponse>(`/api/company/modules/quotations/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  async getQuotationSharedLinks(id: string): Promise<{ links: SharedLinkResponse['link'][] }> {
    return this.request<{ links: SharedLinkResponse['link'][] }>(`/api/company/modules/quotations/${id}/share`);
  }

  async convertQuotationToOrder(id: string): Promise<Order> {
    return this.request<Order>(`/api/company/modules/quotations/${id}/convert`, {
      method: 'POST',
    });
  }

  getQuotationPdfUrl(id: string): string {
    return `/api/company/modules/quotations/${id}/pdf`;
  }

  // ---------- Orders ----------

  async getOrders(filters?: { customerId?: string; status?: string; orderType?: string; q?: string; limit?: number; offset?: number }): Promise<OrdersResponse> {
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
    return this.request<Order>(`/api/company/modules/orders/${id}`);
  }

  async createOrder(data: CreateOrderRequest): Promise<Order> {
    return this.request<Order>('/api/company/modules/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteOrder(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async shareOrder(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    return this.request<SharedLinkResponse>(`/api/company/modules/orders/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- OCR ----------

  async getOcrExtractions(filters?: { status?: string; limit?: number; offset?: number }): Promise<OcrExtractionsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<OcrExtractionsResponse>(`/api/company/modules/orders/ocr${qs ? `?${qs}` : ''}`);
  }

  async getOcrExtraction(id: string): Promise<OcrExtraction> {
    return this.request<OcrExtraction>(`/api/company/modules/orders/ocr/${id}`);
  }

  async uploadOcrImage(file: File, sourceType?: string): Promise<OcrExtraction> {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceType) formData.append('sourceType', sourceType);
    return this.requestFormData<OcrExtraction>('/api/company/modules/orders/ocr', formData);
  }

  async updateOcrExtraction(id: string, data: UpdateOcrExtractionRequest): Promise<OcrExtraction> {
    return this.request<OcrExtraction>(`/api/company/modules/orders/ocr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async convertOcrToOrder(id: string): Promise<{ orderId: string; orderNumber: string }> {
    return this.request<{ orderId: string; orderNumber: string }>(`/api/company/modules/orders/ocr/${id}/convert`, {
      method: 'POST',
    });
  }

  // ---------- Delivery Notes ----------

  async getDeliveryNotes(filters?: { customerId?: string; orderId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<DeliveryNotesResponse> {
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
    return this.request<DeliveryNote>(`/api/company/modules/delivery-notes/${id}`);
  }

  async createDeliveryNoteFromOrder(orderId: string, deliveryDate?: string): Promise<DeliveryNote> {
    return this.request<DeliveryNote>('/api/company/modules/delivery-notes', {
      method: 'POST',
      body: JSON.stringify({ orderId, deliveryDate }),
    });
  }

  async updateDeliveryNoteStatus(id: string, status: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/delivery-notes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteDeliveryNote(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/delivery-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async shareDeliveryNote(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    return this.request<SharedLinkResponse>(`/api/company/modules/delivery-notes/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- Invoices ----------

  async getInvoices(filters?: { customerId?: string; status?: string; q?: string; limit?: number; offset?: number }): Promise<InvoicesResponse> {
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
    return this.request<Invoice>(`/api/company/modules/invoices/${id}`);
  }

  async createInvoice(data: { customerId: string; deliveryNoteIds: string[]; invoiceDate: string; dueDate: string; notes?: string }): Promise<Invoice> {
    return this.request<Invoice>('/api/company/modules/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async addPayment(invoiceId: string, data: { paymentDate: string; amount: number; paymentMethod?: string; reference?: string; notes?: string }): Promise<void> {
    await this.request<{ success: boolean }>(`/api/company/modules/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async shareInvoice(id: string, opts?: { canApprove?: boolean; expiresInDays?: number }): Promise<SharedLinkResponse> {
    return this.request<SharedLinkResponse>(`/api/company/modules/invoices/${id}/share`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // ---------- Dashboard ----------

  async getDashboardSummary(): Promise<{ summary: DashboardSummary; recentOrders: RecentOrder[]; statusDistribution: OrderStatusCount[] }> {
    return this.request('/api/company/modules/dashboard');
  }

  async getDashboardSales(year?: number, month?: number): Promise<DashboardSalesResponse> {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    const qs = params.toString();
    return this.request(`/api/company/modules/dashboard/sales${qs ? `?${qs}` : ''}`);
  }

  async getDashboardRankings(limit?: number): Promise<DashboardRankingsResponse> {
    const qs = limit ? `?limit=${limit}` : '';
    return this.request(`/api/company/modules/dashboard/rankings${qs}`);
  }

  async getDashboardReceivables(): Promise<{ receivables: Receivable[] }> {
    return this.request('/api/company/modules/dashboard/receivables');
  }

  async getDashboardAiAnalysis(refresh?: boolean): Promise<AiAnalysisResult> {
    const qs = refresh ? '?refresh=true' : '';
    return this.request<AiAnalysisResult>(`/api/company/modules/dashboard/ai-analysis${qs}`);
  }

  // ---------- Suggestions ----------

  async getSuggestions(): Promise<AutoSuggestionsResponse> {
    return this.request<AutoSuggestionsResponse>('/api/company/modules/suggestions');
  }

  async getOrderSuggestions(customerId: string): Promise<OrderSuggestionsResponse> {
    return this.request<OrderSuggestionsResponse>(`/api/company/modules/orders/suggestions?customerId=${customerId}`);
  }

  // ---------- LLM Settings ----------

  async getLlmSettings(): Promise<LlmSettingsResponse> {
    return this.request<LlmSettingsResponse>('/api/company/modules/settings');
  }

  async updateLlmSettings(data: UpdateLlmSettingsRequest): Promise<LlmSettingsResponse> {
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
