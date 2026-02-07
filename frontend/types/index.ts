// Company
export interface Company {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUser {
  id: string;
  companyId: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  company?: Company;
}

export interface CompaniesResponse {
  companies: Company[];
  total: number;
}

export interface CreateCompanyRequest {
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface UpdateCompanyRequest {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface CompanyUsersResponse {
  users: CompanyUser[];
  total: number;
}

export interface CreateCompanyUserRequest {
  email: string;
  username: string;
  password: string;
  role?: string;
  isActive?: boolean;
}

export interface UpdateCompanyUserRequest {
  email?: string;
  username?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
}

export interface CompanyLoginResponse {
  access_token: string;
  token_type: string;
  companySlug: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    company: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

// Company Modules
export interface CompanyModule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyModuleAssignment {
  id: string;
  companyId: string;
  moduleId: string;
  module: CompanyModule;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyModulesResponse {
  modules: CompanyModule[];
  total: number;
}

export interface CreateCompanyModuleRequest {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateCompanyModuleRequest {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CompanyModuleWithAssignment extends CompanyModule {
  assigned: boolean;
  assignmentIsActive: boolean;
  config: Record<string, unknown> | null;
}

export interface CompanyModuleAssignmentsResponse {
  modules: CompanyModuleWithAssignment[];
}

export interface UpdateModuleAssignmentRequest {
  moduleId: string;
  isActive: boolean;
}

export interface SidebarCompany {
  id: string;
  name: string;
  slug: string;
  modules: Pick<CompanyModule, 'id' | 'name' | 'slug' | 'icon' | 'sortOrder'>[];
}

export interface SidebarCompaniesResponse {
  companies: SidebarCompany[];
}

export interface BulkUpdateModuleAssignmentsRequest {
  assignments: UpdateModuleAssignmentRequest[];
}

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string | null;
}

// Chat
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  query: string;
  top_k?: number;
  conversation_history?: ConversationMessage[];
}

// FAQ
export interface FAQSource {
  title: string;
  url: string;
  score: number;
}

export interface FAQMacroRef {
  macro_id: number;
  title: string;
  score: number;
}

export interface SimilarTicketRef {
  ticket_id: number;
  subject: string;
  score: number;
}

export interface FAQChatResponse {
  answer: string;
  sources: FAQSource[];
  referenced_macros?: FAQMacroRef[];
  similar_tickets?: SimilarTicketRef[];
}

export interface FAQStats {
  article_count: number;
  model: string;
}

// Internal Tool
export interface TicketSource {
  ticket_id: number;
  subject: string;
  url: string;
  score: number;
}

export interface MacroSuggestion {
  macro_id: number;
  title: string;
  score: number;
  comment_template: string;
}

export interface InternalChatResponse {
  answer: string;
  sources: TicketSource[];
  suggested_macros?: MacroSuggestion[];
}

export interface InternalStats {
  ticket_count: number;
  model: string;
}

// Chat Message
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: FAQSource[] | TicketSource[];
  suggestedMacros?: MacroSuggestion[];
  referencedMacros?: FAQMacroRef[];
  similarTickets?: SimilarTicketRef[];
  timestamp: Date;
  duration?: number;
  isSystemMessage?: boolean; // システムメッセージ（解決確認を表示しない）
}

// User Input Log
export interface UserInputLog {
  endpoint: string;
  timestamp: string;
  category?: string;
  username?: string;
  query: string;
  type: string;
  answer?: string;
  duration_ms?: number;
  sources_count?: number;
  session_id?: string;
  message_id?: string;
  admin_user_id?: string;
  admin_username?: string;
}

export interface UserInputLogsResponse {
  logs: UserInputLog[];
  count: number;
  days: number;
  source?: string;
  message?: string;
  error?: string;
}

// Login Log
export interface LoginLog {
  event_id: string;
  timestamp: string;
  event_type: string;
  username: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  isp?: string;
  admin_user_id?: string;
  admin_username?: string;
}

export interface LoginLogsResponse {
  logs: LoginLog[];
  count: number;
  days: number;
  message?: string;
  error?: string;
}

// Settings
export interface ModelInfo {
  provider: string;
  model: string;
  name: string;
  enabled: boolean;
}

export interface CurrentSettings {
  provider: string;
  model: string;
}

export interface SettingsResponse {
  current: CurrentSettings;
  available_models: ModelInfo[];
}

export interface UpdateSettingsRequest {
  provider: string;
  model: string;
}

// Data Status
export interface DataSourceStatus {
  name: string;
  count: number;
  latest_item_date: string | null;
  latest_ticket_id?: number | null;
  source_file?: string | null;
  file_updated_at: string | null;
  embedding_model: string | null;
  error?: string;
}

export interface DataStatusResponse {
  articles: DataSourceStatus;
  tickets: DataSourceStatus;
  macros: DataSourceStatus;
  updated_at: string;
}

// Data Browse Types
export interface ArticleItem {
  id: number;
  title: string;
  url: string;
  updated_at: string | null;
  category: string | null;
}

export interface TicketItem {
  id: number;
  subject: string;
  url: string;
  updated_at: string | null;
  status: string | null;
}

export interface MacroItem {
  id: number;
  title: string;
  url: string;
  updated_at: string | null;
  is_faq_enabled: boolean;
  is_internal_enabled: boolean;
}

export interface DataListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Operational Rules
// target_gender: ["male"], ["female"], ["male", "female"], or null (not applied)
export interface OperationalRule {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
  target_gender: string[] | null; // ["male", "female"] or null
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface RuleChange {
  old: string | null;
  new: string | null;
}

export interface RuleHistory {
  id: string;
  rule_id: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  timestamp: string;
  username: string;
  changes: Record<string, RuleChange>;
}

export interface CreateRuleRequest {
  title: string;
  content: string;
  enabled?: boolean;
  target_gender?: string[] | null; // ["male", "female"] or null
}

export interface UpdateRuleRequest {
  title?: string;
  content?: string;
  enabled?: boolean;
  order?: number;
  target_gender?: string[] | null; // ["male", "female"] or null
}

export interface RulesListResponse {
  rules: OperationalRule[];
  total: number;
}

export interface RuleHistoryResponse {
  history: RuleHistory[];
  total: number;
}

// Improvement Recommendations
export interface QualityAssessment {
  confidence_score: number;
  information_completeness: 'complete' | 'partial' | 'insufficient';
  suggested_improvement: string | null;
  missing_topics: string[];
}

export interface ImprovementSuggestion {
  id: string;
  topic: string;
  occurrence_count: number;
  sample_questions: string[];
  avg_confidence: number;
  suggested_action: 'create_new' | 'update_existing' | 'add_examples';
  related_faq_ids: string[];
  created_at: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
}

export interface ArticleDraft {
  id: string;
  suggestion_id: string;
  title: string;
  content: string;
  source_questions: string[];
  generated_at: string;
}

export interface ImprovementSuggestionsResponse {
  suggestions: ImprovementSuggestion[];
  total: number;
}

export interface ArticleDraftsResponse {
  drafts: ArticleDraft[];
  total: number;
}

export interface UpdateSuggestionStatusRequest {
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
}

export interface AnalyzeRequest {
  days?: number;
  min_occurrences?: number;
}

// User Status
export type UserStatusCode = 'pending' | 'approved' | 'withdrawn' | 'suspended';

// User Management (Black向け)
export interface User {
  id: string; // BigInt as string
  bdUserId: string; // BigInt as string
  lastName: string;
  firstName: string;
  gender: number; // 1=男性, 2=女性
  email: string;
  mobileNumber: string | null;
  birthday: string | null;
  occupationId: number | null;
  occupation: Occupation | null;
  prefectureId: number | null;
  prefecture: Prefecture | null;
  currentStatus: UserStatusCode;
  planId: number | null;
  plan: Plan | null;
  planStartedAt: string | null;
  score: number;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  profileImageUrl?: string | null;
  profileImages?: string[];
}

export interface Occupation {
  id: number;
  name: string;
  sortOrder: number;
}

export interface Plan {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
}

export interface Prefecture {
  id: number;
  name: string;
  sortOrder: number;
}

export interface CreateUserRequest {
  bdUserId: string;
  lastName: string;
  firstName: string;
  gender: number;
  email: string;
  mobileNumber?: string;
  birthday?: string;
  occupationId?: number;
  prefectureId?: number;
  currentStatus?: UserStatusCode;
  planId?: number;
  planStartedAt?: string;
  score?: number;
}

export interface UpdateUserRequest {
  lastName?: string;
  firstName?: string;
  gender?: number;
  email?: string;
  mobileNumber?: string;
  birthday?: string;
  occupationId?: number;
  prefectureId?: number;
  currentStatus?: UserStatusCode;
  planId?: number;
  planStartedAt?: string;
  score?: number;
}

export interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface OccupationsResponse {
  occupations: Occupation[];
  total: number;
}

export interface PlansResponse {
  plans: Plan[];
  total: number;
}

export interface PrefecturesResponse {
  prefectures: Prefecture[];
  total: number;
}

// User Activity Log
export interface UserActivityLog {
  id: string;
  userId: string;
  adminUserId: string;
  adminUser: {
    id: string;
    username: string;
    email: string;
  };
  content: string;
  createdAt: string;
}

export interface UserActivityLogsResponse {
  logs: UserActivityLog[];
}

// User File
export interface FileData {
  id: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: string;
}

export interface UserFile {
  id: string;
  userId: string;
  fileId: string;
  type: string; // "profile", "interview", "kyc", "date_hearing"
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  file: FileData;
  url: string;
}

export interface UserFilesResponse {
  files: UserFile[];
}

// Matching Venue (レストラン)
export interface MatchingVenue {
  id: string;
  name: string;
  genre: string | null;
  phoneNumber: string | null;
  postalCode: string | null;
  prefectureId: number | null;
  prefecture: Prefecture | null;
  city: string | null;
  address: string | null;
  googleMapUrl: string | null;
  url: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchingVenuesResponse {
  venues: MatchingVenue[];
  total: number;
}

export interface CreateMatchingVenueRequest {
  name: string;
  genre?: string;
  phoneNumber?: string;
  postalCode?: string;
  prefectureId?: number;
  city?: string;
  address?: string;
  googleMapUrl?: string;
  url?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateMatchingVenueRequest {
  name?: string;
  genre?: string;
  phoneNumber?: string;
  postalCode?: string;
  prefectureId?: number;
  city?: string;
  address?: string;
  googleMapUrl?: string;
  url?: string;
  notes?: string;
  isActive?: boolean;
}

// Matching (マッチング/デート)
export type MatchingStatusCode = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface MatchingUserInfo {
  id: string;
  lastName: string;
  firstName: string;
  birthday?: string | null;
  currentStatus?: UserStatusCode;
  occupation?: { id: number; name: string } | null;
  prefecture?: { id: number; name: string } | null;
  plan?: { id: number; name: string; code: string } | null;
  profileImageUrl?: string | null;
  profileImages?: string[];
}

export interface Matching {
  id: string;
  maleUserId: string;
  maleUser: MatchingUserInfo;
  femaleUserId: string;
  femaleUser: MatchingUserInfo;
  startAt: string;
  endAt: string;
  currentStatus: MatchingStatusCode;
  venueId: string | null;
  venue: MatchingVenue | null;
  arrangedByAdminId: string;
  arrangedByAdmin: {
    id: string;
    username: string;
  };
  maleRating: number | null;
  femaleRating: number | null;
  notes: string | null;
  feedbacks?: MatchingFeedback[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchingsResponse {
  matchings: Matching[];
  total: number;
}

export interface CreateMatchingRequest {
  maleUserId: string;
  femaleUserId: string;
  startAt: string;
  endAt: string;
  venueId?: string;
  notes?: string;
}

export interface UpdateMatchingRequest {
  maleUserId?: string;
  femaleUserId?: string;
  startAt?: string;
  endAt?: string;
  currentStatus?: MatchingStatusCode;
  venueId?: string | null;
  maleRating?: number | null;
  femaleRating?: number | null;
  notes?: string;
}

// Matching Activity Log (マッチングアクティビティログ)
export type MatchingActivityLogType =
  | 'comment'
  | 'status_change'
  | 'venue_change'
  | 'date_change'
  | 'rating_change'
  | 'created';

export interface MatchingActivityLog {
  id: string;
  matchingId: string;
  adminUserId: string;
  adminUser: {
    id: string;
    username: string;
  };
  type: MatchingActivityLogType;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MatchingActivityLogsResponse {
  logs: MatchingActivityLog[];
}

export interface CreateMatchingActivityLogRequest {
  content: string;
}

// User Preferences (希望条件)
export type PreferenceFieldType = 'range' | 'text' | 'select' | 'multiSelect';

export interface RangeOptions {
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  labels?: Record<number, string>;
}

export interface SelectOptions {
  choices: string[];
}

export interface TextOptions {
  maxLength?: number;
  placeholder?: string;
}

export interface UserPreferenceType {
  id: string;
  code: string;
  name: string;
  fieldType: PreferenceFieldType;
  options: RangeOptions | SelectOptions | TextOptions | null;
  targetGender: number | null; // 1=男性向け, 2=女性向け, null=両方
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  preferenceTypeId: string;
  preferenceType?: UserPreferenceType;
  value: RangeValue | string | string[]; // range: {min, max}, select: string, multiSelect: string[], text: string
  createdAt: string;
  updatedAt: string;
}

export interface RangeValue {
  min?: number | null;
  max?: number | null;
}

export interface UserPreferenceTypesResponse {
  preferenceTypes: UserPreferenceType[];
}

export interface UserPreferencesResponse {
  preferences: UserPreference[];
}

export interface SaveUserPreferenceRequest {
  preferenceTypeId: string;
  value: RangeValue | string | string[];
}

export interface SaveUserPreferencesRequest {
  preferences: SaveUserPreferenceRequest[];
}

// User Attribute (ユーザー属性)
export interface UserAttributeType {
  id: string;
  code: string;
  name: string;
  fieldType: PreferenceFieldType;
  options: RangeOptions | SelectOptions | TextOptions | null;
  targetGender: number | null;
  relatedPreferenceCode: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAttribute {
  id: string;
  userId: string;
  attributeTypeId: string;
  attributeType?: UserAttributeType;
  value: RangeValue | string | string[] | number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAttributeTypesResponse {
  attributeTypes: UserAttributeType[];
}

export interface UserAttributesResponse {
  attributes: UserAttribute[];
}

export interface SaveUserAttributeRequest {
  attributeTypeId: string;
  value: RangeValue | string | string[] | number;
}

export interface SaveUserAttributesRequest {
  attributes: SaveUserAttributeRequest[];
}

// Profile Extraction (AIプロフィール抽出)
export interface ExtractedProfileValue {
  code: string;
  name: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ExtractedBasicInfo {
  field: string;
  name: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ProfileExtractionResult {
  basicInfo: ExtractedBasicInfo[];
  attributes: ExtractedProfileValue[];
  preferences: ExtractedProfileValue[];
}

// User Availability Pattern (空き時間パターン)
export type DayType =
  | 'weekday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'
  | 'holiday';

export interface UserAvailabilityPattern {
  id: string;
  userId: string;
  dayType: DayType;
  dayTypeLabel: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAvailabilityPatternsResponse {
  patterns: UserAvailabilityPattern[];
}

export interface CreateAvailabilityPatternRequest {
  dayType: DayType;
  startTime: string;
  endTime: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateAvailabilityPatternRequest {
  dayType?: DayType;
  startTime?: string;
  endTime?: string;
  notes?: string;
  isActive?: boolean;
}

// Matching Candidates (マッチング候補者)
export interface PastMatchingSummary {
  id: string;
  startAt: string;
  endAt: string;
  currentStatus: string;
  venue: { id: string; name: string } | null;
}

export interface MatchingCandidate extends User {
  matchScore: number;
  pastMatchings: PastMatchingSummary[];
  pastMatchingCount: number;
  profileImageUrl: string | null;
  profileImages: string[];
}

export interface MatchingCandidatesResponse {
  candidates: MatchingCandidate[];
  total: number;
  sourceUser: {
    id: string;
    lastName: string;
    firstName: string;
    gender: number;
    preferences: { preferenceTypeCode: string; value: unknown }[];
  };
}

export interface CandidateFilters {
  q?: string;
  prefectureId?: string;
  occupationId?: string;
  ageMin?: string;
  ageMax?: string;
}

// Interview (面談)
export type InterviewStatusCode = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface InterviewType {
  id: string;
  name: string;
  code: string;
  durationMinutes: number;
  targetGender: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  timerexBookingId: string | null;
  interviewTypeId: string;
  interviewType?: InterviewType;
  userId: string | null;
  user: {
    id: string;
    lastName: string;
    firstName: string;
  } | null;
  adminUserId: string;
  adminUser?: {
    id: string;
    username: string;
  } | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  currentStatus: InterviewStatusCode;
  notes: string | null;
  timerexData: Record<string, unknown> | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewTypesResponse {
  interviewTypes: InterviewType[];
  total: number;
}

export interface InterviewsResponse {
  interviews: Interview[];
  total: number;
}

export interface CreateInterviewRequest {
  interviewTypeId: string;
  userId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  interviewTypeId?: string;
  userId?: string | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  meetingUrl?: string;
  currentStatus?: InterviewStatusCode;
  notes?: string;
}

// Interview Activity Log (面談アクティビティログ)
export interface InterviewActivityLog {
  id: string;
  interviewId: string;
  adminUserId: string;
  adminUser: {
    id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

export interface InterviewActivityLogsResponse {
  logs: InterviewActivityLog[];
}

export interface CreateInterviewTypeRequest {
  name: string;
  code: string;
  durationMinutes?: number;
  targetGender?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateInterviewTypeRequest {
  name?: string;
  code?: string;
  durationMinutes?: number;
  targetGender?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

// Matching Extraction (AIマッチング抽出)
export interface ExtractedMatchingUser {
  searchQuery: string;
  suggestedId: string | null;
  suggestedName: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ExtractedMatchingDateTime {
  suggestedStartAt: string | null;
  suggestedEndAt: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ExtractedMatchingVenue {
  suggestedName: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ExtractedMatchingNotes {
  suggestedValue: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface MatchingExtractionResult {
  maleUser: ExtractedMatchingUser;
  femaleUser: ExtractedMatchingUser;
  dateTime: ExtractedMatchingDateTime;
  venue: ExtractedMatchingVenue;
  notes: ExtractedMatchingNotes;
}

// Matching Feedback (マッチングフィードバック - 感想/コメント履歴)
export interface MatchingFeedback {
  id: string;
  matchingId: string;
  userId: string;
  user: {
    id: string;
    lastName: string;
    firstName: string;
  };
  adminUserId: string;
  adminUser: {
    id: string;
    username: string;
  };
  content: string;
  createdAt: string;
}

export interface MatchingFeedbacksResponse {
  feedbacks: MatchingFeedback[];
}

export interface CreateMatchingFeedbackRequest {
  userId: string;
  rating?: number | null; // Matching の maleRating or femaleRating も一緒に更新
  content: string;
  criteria?: EvaluationCriteriaInput[]; // 評価観点も一緒に保存（upsert）
}

// Matching Evaluation Criteria (マッチング評価観点)
// 観点タイプマスタ
export interface EvaluationCriteriaType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  fieldType: 'rating' | 'choice';
  options: {
    min?: number;
    max?: number;
    labels?: Record<string, string>;
    choices?: string[];
  } | null;
  sortOrder: number;
  isActive: boolean;
}

export interface EvaluationCriteriaTypesResponse {
  criteriaTypes: EvaluationCriteriaType[];
}

// 評価観点の入力
export interface EvaluationCriteriaInput {
  criteriaTypeId: string;
  value: string;
}

// 保存済みの評価観点
export interface MatchingEvaluationCriteria {
  id: string;
  matchingId: string;
  userId: string;
  criteriaTypeId: string;
  criteriaType: EvaluationCriteriaType;
  value: string;
  createdByAdminId: string;
  createdByAdmin: {
    id: string;
    username: string;
  };
  updatedByAdminId: string;
  updatedByAdmin: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MatchingEvaluationCriteriaResponse {
  criteria: MatchingEvaluationCriteria[];
}

// AIが抽出した評価観点の提案
export interface ExtractedEvaluationCriteria {
  criteriaTypeId: string;
  criteriaTypeCode: string;
  criteriaTypeName: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface EvaluationCriteriaExtractionResult {
  criteria: ExtractedEvaluationCriteria[];
}

// Documents (書類管理)
export interface DocumentItem {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Url: string;
  uploadedByName: string;
  status: 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  pageCount: number | null;
  tags: DocumentTag[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface DocumentSearchResult {
  document: DocumentItem;
  relevantChunks: { content: string; score: number }[];
  maxScore: number;
}

export interface DocumentsResponse {
  documents: DocumentItem[];
  total: number;
}

export interface DocumentTagsResponse {
  tags: DocumentTag[];
}

export interface DocumentSearchResponse {
  results: DocumentSearchResult[];
  query: string;
}
