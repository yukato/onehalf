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
  InternalChatResponse,
  InternalStats,
  UserInputLogsResponse,
  LoginLogsResponse,
  SettingsResponse,
  UpdateSettingsRequest,
  DataStatusResponse,
  DataListResponse,
  ArticleItem,
  TicketItem,
  MacroItem,
  ConversationMessage,
  OperationalRule,
  CreateRuleRequest,
  UpdateRuleRequest,
  RulesListResponse,
  RuleHistoryResponse,
  ImprovementSuggestion,
  ArticleDraft,
  ImprovementSuggestionsResponse,
  ArticleDraftsResponse,
  UpdateSuggestionStatusRequest,
  AnalyzeRequest,
  AdminUser,
  User,
  UsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
  OccupationsResponse,
  PlansResponse,
  PrefecturesResponse,
  Prefecture,
  UserActivityLog,
  UserActivityLogsResponse,
  UserFile,
  UserFilesResponse,
  MatchingVenue,
  MatchingVenuesResponse,
  CreateMatchingVenueRequest,
  UpdateMatchingVenueRequest,
  Matching,
  MatchingsResponse,
  CreateMatchingRequest,
  UpdateMatchingRequest,
  MatchingActivityLog,
  MatchingActivityLogsResponse,
  CreateMatchingActivityLogRequest,
  MatchingFeedback,
  MatchingFeedbacksResponse,
  CreateMatchingFeedbackRequest,
  EvaluationCriteriaTypesResponse,
  EvaluationCriteriaExtractionResult,
  MatchingEvaluationCriteria,
  MatchingEvaluationCriteriaResponse,
  EvaluationCriteriaInput,
  UserPreferenceType,
  UserPreferenceTypesResponse,
  UserPreference,
  UserPreferencesResponse,
  SaveUserPreferencesRequest,
  UserAttributeType,
  UserAttributeTypesResponse,
  UserAttribute,
  UserAttributesResponse,
  SaveUserAttributesRequest,
  MatchingCandidatesResponse,
  CandidateFilters,
  InterviewType,
  InterviewTypesResponse,
  Interview,
  InterviewsResponse,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  InterviewActivityLog,
  InterviewActivityLogsResponse,
  UserAvailabilityPattern,
  UserAvailabilityPatternsResponse,
  CreateAvailabilityPatternRequest,
  UpdateAvailabilityPatternRequest,
  ProfileExtractionResult,
  MatchingExtractionResult,
  DocumentsResponse,
  DocumentItem,
  DocumentTagsResponse,
  DocumentTag,
  DocumentSearchResponse,
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
    const res = await fetch('/api/admin/auth/login', {
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
    const res = await fetch('/api/admin/auth/refresh', {
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
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    this.accessToken = null;
    this.currentUser = null;
  }

  async getMe(): Promise<AdminUser | null> {
    if (!this.accessToken) return null;

    try {
      const data = await this.requestNextApi<{ user: AdminUser }>('/api/admin/auth/me');
      this.currentUser = data.user;
      return data.user;
    } catch {
      return null;
    }
  }

  // Admin User Management (Next.js API)
  async getAdminUsers(): Promise<{ users: AdminUser[]; total: number }> {
    return this.requestNextApi<{ users: AdminUser[]; total: number }>('/api/admin/users');
  }

  async getAdminUser(id: string): Promise<AdminUser> {
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

  async chatInternal(query: string, topK: number = 3): Promise<InternalChatResponse> {
    return this.request<InternalChatResponse>('/api/internal/chat', {
      method: 'POST',
      body: JSON.stringify({ query, top_k: topK }),
    });
  }

  async getInternalStats(): Promise<InternalStats> {
    return this.request<InternalStats>('/api/internal/stats');
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

  async getDataStatus(): Promise<DataStatusResponse> {
    return this.request<DataStatusResponse>('/api/admin/data-status');
  }

  async getArticles(
    q?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DataListResponse<ArticleItem>> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request<DataListResponse<ArticleItem>>(`/api/data/articles?${params.toString()}`);
  }

  async getTickets(
    q?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DataListResponse<TicketItem>> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request<DataListResponse<TicketItem>>(`/api/data/tickets?${params.toString()}`);
  }

  async getMacros(
    q?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DataListResponse<MacroItem>> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request<DataListResponse<MacroItem>>(`/api/data/macros?${params.toString()}`);
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

  // Improvement Recommendations
  async getImprovementSuggestions(
    status?: string,
    limit: number = 50
  ): Promise<ImprovementSuggestionsResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    return this.request<ImprovementSuggestionsResponse>(
      `/api/improvements/suggestions?${params.toString()}`
    );
  }

  async getImprovementSuggestion(suggestionId: string): Promise<ImprovementSuggestion> {
    return this.request<ImprovementSuggestion>(`/api/improvements/suggestions/${suggestionId}`);
  }

  async updateSuggestionStatus(
    suggestionId: string,
    status: UpdateSuggestionStatusRequest['status']
  ): Promise<ImprovementSuggestion> {
    return this.request<ImprovementSuggestion>(
      `/api/improvements/suggestions/${suggestionId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }
    );
  }

  async generateArticleDraft(suggestionId: string): Promise<ArticleDraft> {
    return this.request<ArticleDraft>(
      `/api/improvements/suggestions/${suggestionId}/generate-draft`,
      {
        method: 'POST',
      }
    );
  }

  async getArticleDrafts(limit: number = 50): Promise<ArticleDraftsResponse> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    return this.request<ArticleDraftsResponse>(`/api/improvements/drafts?${params.toString()}`);
  }

  async getArticleDraft(draftId: string): Promise<ArticleDraft> {
    return this.request<ArticleDraft>(`/api/improvements/drafts/${draftId}`);
  }

  async analyzeForImprovements(
    request: AnalyzeRequest = {}
  ): Promise<ImprovementSuggestionsResponse> {
    return this.request<ImprovementSuggestionsResponse>('/api/improvements/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // User Management (Black向け)
  async getUsers(
    q?: string,
    limit: number = 50,
    offset: number = 0,
    includeDeleted: boolean = false,
    filters?: {
      gender?: string;
      status?: string;
      planId?: string;
      prefectureId?: string;
      occupationId?: string;
      score?: string;
      age?: string;
    }
  ): Promise<UsersResponse> {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (includeDeleted) params.append('include_deleted', 'true');
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.planId) params.append('plan_id', filters.planId);
    if (filters?.prefectureId) params.append('prefecture_id', filters.prefectureId);
    if (filters?.occupationId) params.append('occupation_id', filters.occupationId);
    if (filters?.score) params.append('score', filters.score);
    if (filters?.age) params.append('age', filters.age);
    return this.requestNextApi<UsersResponse>(`/api/black/users?${params.toString()}`);
  }

  async getUser(id: string): Promise<User> {
    return this.requestNextApi<User>(`/api/black/users/${id}`);
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    return this.requestNextApi<User>('/api/black/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    return this.requestNextApi<User>(`/api/black/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Activity Logs
  async getUserActivityLogs(userId: string): Promise<UserActivityLogsResponse> {
    return this.requestNextApi<UserActivityLogsResponse>(
      `/api/black/users/${userId}/activity-logs`
    );
  }

  async createUserActivityLog(userId: string, content: string): Promise<UserActivityLog> {
    return this.requestNextApi<UserActivityLog>(`/api/black/users/${userId}/activity-logs`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // User Files
  async getUserFiles(userId: string, type?: string): Promise<UserFilesResponse> {
    const url = type
      ? `/api/black/users/${userId}/files?type=${type}`
      : `/api/black/users/${userId}/files`;
    return this.requestNextApi<UserFilesResponse>(url);
  }

  async uploadUserFile(
    userId: string,
    file: File,
    type: string,
    isPrimary: boolean = false
  ): Promise<UserFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('isPrimary', isPrimary.toString());

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`/api/black/users/${userId}/files`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return res.json();
  }

  async deleteUserFile(userId: string, fileId: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/users/${userId}/files?fileId=${fileId}`, {
      method: 'DELETE',
    });
  }

  async updateUserFilePrimary(userId: string, fileId: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/users/${userId}/files/${fileId}/primary`, {
      method: 'PUT',
    });
  }

  async registerUserFileUrl(
    userId: string,
    url: string,
    type: string,
    isPrimary: boolean = false
  ): Promise<UserFile> {
    return this.requestNextApi<UserFile>(`/api/black/users/${userId}/files`, {
      method: 'PUT',
      body: JSON.stringify({ url, type, isPrimary }),
    });
  }

  async getOccupations(): Promise<OccupationsResponse> {
    return this.requestNextApi<OccupationsResponse>('/api/black/occupations');
  }

  async getPlans(): Promise<PlansResponse> {
    return this.requestNextApi<PlansResponse>('/api/black/plans');
  }

  async getPrefectures(): Promise<Prefecture[]> {
    return this.requestNextApi<Prefecture[]>('/api/black/prefectures');
  }

  // Matching Venues (レストラン)
  async getVenues(
    search?: string,
    activeOnly: boolean = true,
    filters?: { prefectureId?: string; genre?: string }
  ): Promise<MatchingVenuesResponse> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('activeOnly', activeOnly.toString());
    if (filters?.prefectureId) params.append('prefectureId', filters.prefectureId);
    if (filters?.genre) params.append('genre', filters.genre);
    return this.requestNextApi<MatchingVenuesResponse>(`/api/black/venues?${params.toString()}`);
  }

  async getVenue(id: string): Promise<MatchingVenue> {
    return this.requestNextApi<MatchingVenue>(`/api/black/venues/${id}`);
  }

  async createVenue(data: CreateMatchingVenueRequest): Promise<MatchingVenue> {
    return this.requestNextApi<MatchingVenue>('/api/black/venues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVenue(id: string, data: UpdateMatchingVenueRequest): Promise<MatchingVenue> {
    return this.requestNextApi<MatchingVenue>(`/api/black/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVenue(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/venues/${id}`, {
      method: 'DELETE',
    });
  }

  // Matchings (マッチング)
  async getMatchings(
    filters?: { status?: string; fromDate?: string; toDate?: string; q?: string },
    limit: number = 50,
    offset: number = 0
  ): Promise<MatchingsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.q) params.append('q', filters.q);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.requestNextApi<MatchingsResponse>(`/api/black/matchings?${params.toString()}`);
  }

  async getMatching(id: string): Promise<Matching> {
    return this.requestNextApi<Matching>(`/api/black/matchings/${id}`);
  }

  async createMatching(data: CreateMatchingRequest): Promise<Matching> {
    return this.requestNextApi<Matching>('/api/black/matchings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMatching(id: string, data: UpdateMatchingRequest): Promise<Matching> {
    return this.requestNextApi<Matching>(`/api/black/matchings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMatching(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/matchings/${id}`, {
      method: 'DELETE',
    });
  }

  // Matching Activity Logs (マッチングアクティビティログ)
  async getMatchingActivityLogs(matchingId: string): Promise<MatchingActivityLogsResponse> {
    return this.requestNextApi<MatchingActivityLogsResponse>(
      `/api/black/matchings/${matchingId}/activities`
    );
  }

  async createMatchingActivityLog(
    matchingId: string,
    data: CreateMatchingActivityLogRequest
  ): Promise<MatchingActivityLog> {
    return this.requestNextApi<MatchingActivityLog>(
      `/api/black/matchings/${matchingId}/activities`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Matching Feedbacks (フィードバック)
  async getMatchingFeedbacks(matchingId: string): Promise<MatchingFeedbacksResponse> {
    return this.requestNextApi<MatchingFeedbacksResponse>(
      `/api/black/matchings/${matchingId}/feedbacks`
    );
  }

  async createMatchingFeedback(
    matchingId: string,
    data: CreateMatchingFeedbackRequest
  ): Promise<MatchingFeedback> {
    return this.requestNextApi<MatchingFeedback>(`/api/black/matchings/${matchingId}/feedbacks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Evaluation Criteria Types (評価観点マスタ)
  async getEvaluationCriteriaTypes(): Promise<EvaluationCriteriaTypesResponse> {
    return this.requestNextApi<EvaluationCriteriaTypesResponse>(
      '/api/black/matchings/feedback-criteria-types'
    );
  }

  // Extract Evaluation Criteria (AIでフィードバックから評価観点を抽出)
  async extractEvaluationCriteria(
    matchingId: string,
    content: string,
    userId?: string
  ): Promise<EvaluationCriteriaExtractionResult> {
    return this.requestNextApi<EvaluationCriteriaExtractionResult>(
      `/api/black/matchings/${matchingId}/feedbacks/extract-criteria`,
      {
        method: 'POST',
        body: JSON.stringify({ content, userId }),
      }
    );
  }

  // Matching Evaluation Criteria (評価観点)
  async getMatchingEvaluationCriteria(
    matchingId: string,
    userId?: string
  ): Promise<MatchingEvaluationCriteriaResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    return this.requestNextApi<MatchingEvaluationCriteriaResponse>(
      `/api/black/matchings/${matchingId}/evaluation-criteria?${params.toString()}`
    );
  }

  async saveMatchingEvaluationCriteria(
    matchingId: string,
    userId: string,
    criteria: EvaluationCriteriaInput[]
  ): Promise<MatchingEvaluationCriteriaResponse> {
    return this.requestNextApi<MatchingEvaluationCriteriaResponse>(
      `/api/black/matchings/${matchingId}/evaluation-criteria`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, criteria }),
      }
    );
  }

  // User Preferences (希望条件)
  async getPreferenceTypes(targetGender?: number): Promise<UserPreferenceTypesResponse> {
    const params = new URLSearchParams();
    if (targetGender !== undefined) params.append('targetGender', targetGender.toString());
    return this.requestNextApi<UserPreferenceTypesResponse>(
      `/api/black/preference-types?${params.toString()}`
    );
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    return this.requestNextApi<UserPreferencesResponse>(`/api/black/users/${userId}/preferences`);
  }

  async saveUserPreferences(
    userId: string,
    data: SaveUserPreferencesRequest
  ): Promise<UserPreferencesResponse> {
    return this.requestNextApi<UserPreferencesResponse>(`/api/black/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUserPreference(userId: string, preferenceTypeId: string): Promise<void> {
    await this.requestNextApi<void>(
      `/api/black/users/${userId}/preferences?preferenceTypeId=${preferenceTypeId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // User Attributes (ユーザー属性)
  async getAttributeTypes(targetGender?: number): Promise<UserAttributeTypesResponse> {
    const params = new URLSearchParams();
    if (targetGender !== undefined) params.append('targetGender', targetGender.toString());
    return this.requestNextApi<UserAttributeTypesResponse>(
      `/api/black/user-attribute-types?${params.toString()}`
    );
  }

  async getUserAttributes(userId: string): Promise<UserAttributesResponse> {
    return this.requestNextApi<UserAttributesResponse>(`/api/black/users/${userId}/attributes`);
  }

  async saveUserAttributes(
    userId: string,
    data: SaveUserAttributesRequest
  ): Promise<UserAttributesResponse> {
    return this.requestNextApi<UserAttributesResponse>(`/api/black/users/${userId}/attributes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Profile Extraction (AIプロフィール抽出)
  async extractProfile(userId: string, text: string): Promise<ProfileExtractionResult> {
    return this.requestNextApi<ProfileExtractionResult>(
      `/api/black/users/${userId}/extract-profile`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      }
    );
  }

  // Matching Extraction (AIマッチング抽出)
  async extractMatching(text: string): Promise<MatchingExtractionResult> {
    return this.requestNextApi<MatchingExtractionResult>('/api/black/matchings/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // User Availability Patterns (空き時間パターン)
  async getUserAvailabilityPatterns(userId: string): Promise<UserAvailabilityPatternsResponse> {
    return this.requestNextApi<UserAvailabilityPatternsResponse>(
      `/api/black/users/${userId}/availability-patterns`
    );
  }

  async createAvailabilityPattern(
    userId: string,
    data: CreateAvailabilityPatternRequest
  ): Promise<UserAvailabilityPattern> {
    return this.requestNextApi<UserAvailabilityPattern>(
      `/api/black/users/${userId}/availability-patterns`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateAvailabilityPattern(
    userId: string,
    patternId: string,
    data: UpdateAvailabilityPatternRequest
  ): Promise<UserAvailabilityPattern> {
    return this.requestNextApi<UserAvailabilityPattern>(
      `/api/black/users/${userId}/availability-patterns/${patternId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteAvailabilityPattern(userId: string, patternId: string): Promise<void> {
    await this.requestNextApi<void>(
      `/api/black/users/${userId}/availability-patterns/${patternId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Matching Candidates (マッチング候補者)
  async getMatchingCandidates(
    userId: string,
    filters?: CandidateFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<MatchingCandidatesResponse> {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.prefectureId) params.append('prefectureId', filters.prefectureId);
    if (filters?.occupationId) params.append('occupationId', filters.occupationId);
    if (filters?.ageMin) params.append('ageMin', filters.ageMin);
    if (filters?.ageMax) params.append('ageMax', filters.ageMax);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.requestNextApi<MatchingCandidatesResponse>(
      `/api/black/users/${userId}/candidates?${params.toString()}`
    );
  }

  // Interview Types (面談種類マスタ)
  async getInterviewTypes(
    activeOnly: boolean = false,
    targetGender?: number
  ): Promise<InterviewTypesResponse> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('activeOnly', 'true');
    if (targetGender !== undefined) params.append('targetGender', targetGender.toString());
    return this.requestNextApi<InterviewTypesResponse>(
      `/api/black/interview-types?${params.toString()}`
    );
  }

  async getInterviewType(id: string): Promise<InterviewType> {
    return this.requestNextApi<InterviewType>(`/api/black/interview-types/${id}`);
  }

  async createInterviewType(data: {
    name: string;
    code: string;
    durationMinutes?: number;
    targetGender?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<InterviewType> {
    return this.requestNextApi<InterviewType>('/api/black/interview-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterviewType(
    id: string,
    data: {
      name?: string;
      code?: string;
      durationMinutes?: number;
      targetGender?: number | null;
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<InterviewType> {
    return this.requestNextApi<InterviewType>(`/api/black/interview-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInterviewType(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/interview-types/${id}`, {
      method: 'DELETE',
    });
  }

  // Interviews (面談)
  async getInterviews(
    filters?: {
      status?: string;
      typeId?: string;
      fromDate?: string;
      toDate?: string;
      q?: string;
      userId?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<InterviewsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.typeId) params.append('typeId', filters.typeId);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.userId) params.append('userId', filters.userId);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.requestNextApi<InterviewsResponse>(`/api/black/interviews?${params.toString()}`);
  }

  async getInterview(id: string): Promise<Interview> {
    return this.requestNextApi<Interview>(`/api/black/interviews/${id}`);
  }

  async createInterview(data: CreateInterviewRequest): Promise<Interview> {
    return this.requestNextApi<Interview>('/api/black/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterview(id: string, data: UpdateInterviewRequest): Promise<Interview> {
    return this.requestNextApi<Interview>(`/api/black/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInterview(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/black/interviews/${id}`, {
      method: 'DELETE',
    });
  }

  // Interview Activity Logs (面談アクティビティログ)
  async getInterviewActivityLogs(interviewId: string): Promise<InterviewActivityLogsResponse> {
    return this.requestNextApi<InterviewActivityLogsResponse>(
      `/api/black/interviews/${interviewId}/activity-logs`
    );
  }

  async createInterviewActivityLog(
    interviewId: string,
    content: string
  ): Promise<InterviewActivityLog> {
    return this.requestNextApi<InterviewActivityLog>(
      `/api/black/interviews/${interviewId}/activity-logs`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }

  // TimeRex Import
  async importInterviewsFromTimeRex(
    interviewTypeId: string,
    since?: string,
    until?: string
  ): Promise<{
    success: boolean;
    message: string;
    stats: {
      fetched: number;
      created: number;
      updated: number;
      unchanged: number;
      errors: number;
    };
  }> {
    return this.requestNextApi('/api/black/interviews/import-timerex', {
      method: 'POST',
      body: JSON.stringify({ interviewTypeId, since, until }),
    });
  }

  // Company Management (Admin)
  async getCompanies(): Promise<CompaniesResponse> {
    return this.requestNextApi<CompaniesResponse>('/api/admin/companies');
  }

  async getCompany(id: string): Promise<Company> {
    return this.requestNextApi<Company>(`/api/admin/companies/${id}`);
  }

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    return this.requestNextApi<Company>('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company> {
    return this.requestNextApi<Company>(`/api/admin/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string): Promise<void> {
    await this.requestNextApi<void>(`/api/admin/companies/${id}`, {
      method: 'DELETE',
    });
  }

  async getCompanyUsers(companyId: string): Promise<CompanyUsersResponse> {
    return this.requestNextApi<CompanyUsersResponse>(`/api/admin/companies/${companyId}/users`);
  }

  async createCompanyUser(companyId: string, data: CreateCompanyUserRequest): Promise<CompanyUser> {
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
    return this.requestNextApi<CompanyUser>(`/api/admin/companies/${companyId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyUser(companyId: string, userId: string): Promise<void> {
    await this.requestNextApi<void>(`/api/admin/companies/${companyId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Module Master CRUD
  async getModules(): Promise<CompanyModulesResponse> {
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
    return this.requestNextApi<SidebarCompaniesResponse>('/api/admin/companies/sidebar');
  }

  // Company Module Assignments
  async getCompanyModules(companyId: string): Promise<CompanyModuleAssignmentsResponse> {
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
    return this.requestNextApi<DocumentItem>(`/api/admin/c/${companySlug}/documents/${id}`);
  }

  async uploadCompanyDocument(companySlug: string, file: File, title?: string, tagIds?: string[]): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tagIds && tagIds.length > 0) formData.append('tagIds', JSON.stringify(tagIds));
    return this.requestNextApiFormData<DocumentItem>(`/api/admin/c/${companySlug}/documents`, formData);
  }

  async updateCompanyDocument(companySlug: string, id: string, data: { title?: string; tagIds?: string[] }): Promise<DocumentItem> {
    return this.requestNextApi<DocumentItem>(`/api/admin/c/${companySlug}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyDocument(companySlug: string, id: string): Promise<void> {
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async searchCompanyDocuments(companySlug: string, query: string, limit?: number): Promise<DocumentSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set('limit', String(limit));
    return this.requestNextApi<DocumentSearchResponse>(`/api/admin/c/${companySlug}/documents/search?${params}`);
  }

  async getCompanyDocumentTags(companySlug: string): Promise<DocumentTagsResponse> {
    return this.requestNextApi<DocumentTagsResponse>(`/api/admin/c/${companySlug}/documents/tags`);
  }

  async createCompanyDocumentTag(companySlug: string, data: { name: string; slug: string; color?: string }): Promise<DocumentTag> {
    return this.requestNextApi<DocumentTag>(`/api/admin/c/${companySlug}/documents/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyDocumentTag(companySlug: string, id: string, data: { name?: string; slug?: string; color?: string }): Promise<void> {
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyDocumentTag(companySlug: string, id: string): Promise<void> {
    await this.requestNextApi<{ success: boolean }>(`/api/admin/c/${companySlug}/documents/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // CSV Export - ブラウザでダウンロードするためBlobを返す
  async exportUsersCSV(type: 'data' | 'template' = 'data'): Promise<Blob> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`/api/black/users/export?type=${type}`, {
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Export failed');
    }

    return res.blob();
  }

  // CSV Import
  async importUsersCSV(file: File): Promise<{
    success: number;
    failed: number;
    errors: { row: number; bdUserId: string; error: string }[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const res = await fetch('/api/black/users/import', {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(error.detail || 'Import failed');
    }

    return res.json();
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
