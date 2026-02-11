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

// LLM Settings (会社別LLM設定)
export interface AvailableLlmModel {
  provider: string;
  model: string;
  name: string;
}

export const AVAILABLE_LLM_MODELS: AvailableLlmModel[] = [
  { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
  { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' },
  { provider: 'openai', model: 'gpt-4o-mini', name: 'GPT-4o mini' },
];

export interface AvailableEmbeddingModel {
  model: string;
  name: string;
  dimensions: number;
}

export const AVAILABLE_EMBEDDING_MODELS: AvailableEmbeddingModel[] = [
  { model: 'intfloat/multilingual-e5-small', name: 'E5 Small (384次元, 高速)', dimensions: 384 },
  { model: 'intfloat/multilingual-e5-base', name: 'E5 Base (768次元, バランス)', dimensions: 768 },
  { model: 'intfloat/multilingual-e5-large', name: 'E5 Large (1024次元, 高精度)', dimensions: 1024 },
];

export interface LlmSettingsResponse {
  provider: string;
  model: string;
  hasAnthropicKey: boolean;
  hasOpenaiKey: boolean;
  embeddingModel: string;
  availableModels: AvailableLlmModel[];
}

export interface UpdateLlmSettingsRequest {
  provider?: string;
  model?: string;
  apiKeyAnthropic?: string | null;
  apiKeyOpenai?: string | null;
  embeddingModel?: string;
}

// ---------- Document Chat ----------

export interface DocumentChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocumentChatSource {
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

export interface DocumentChatResponse {
  answer: string;
  sources: DocumentChatSource[];
  model: string;
}

// ========== 業務システム型定義 ==========

// ---------- 取引先マスタ ----------

export type CustomerType = 'customer' | 'supplier' | 'both';

export interface Customer {
  id: string;
  code: string;
  name: string;
  nameKana: string | null;
  customerType: CustomerType;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  contactPerson: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export interface CreateCustomerRequest {
  code: string;
  name: string;
  nameKana?: string;
  customerType: CustomerType;
  postalCode?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactPerson?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateCustomerRequest {
  code?: string;
  name?: string;
  nameKana?: string;
  customerType?: CustomerType;
  postalCode?: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactPerson?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

// ---------- 商品マスタ ----------

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ProductCategoriesResponse {
  categories: ProductCategory[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  nameKana: string | null;
  category: ProductCategory | null;
  categoryId: string | null;
  unit: string;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
}

export interface CreateProductRequest {
  code: string;
  name: string;
  nameKana?: string;
  categoryId?: string;
  unit?: string;
  unitPrice: number;
  costPrice?: number;
  taxRate?: number;
  description?: string;
}

export interface UpdateProductRequest {
  code?: string;
  name?: string;
  nameKana?: string;
  categoryId?: string | null;
  unit?: string;
  unitPrice?: number;
  costPrice?: number;
  taxRate?: number;
  description?: string;
  isActive?: boolean;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// ---------- 見積書 ----------

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface QuotationItem {
  id: string;
  sortOrder: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  notes: string | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer: Pick<Customer, 'id' | 'name' | 'code'>;
  subject: string | null;
  quotationDate: string;
  validUntil: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  internalMemo: string | null;
  status: QuotationStatus;
  items: QuotationItem[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationsResponse {
  quotations: Omit<Quotation, 'items'>[];
  total: number;
}

export interface CreateQuotationItemInput {
  productId?: string;
  productCode?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate?: number;
  notes?: string;
}

export interface CreateQuotationRequest {
  customerId: string;
  subject?: string;
  quotationDate: string;
  validUntil?: string;
  notes?: string;
  internalMemo?: string;
  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationRequest {
  customerId?: string;
  subject?: string;
  quotationDate?: string;
  validUntil?: string;
  notes?: string;
  internalMemo?: string;
  items?: CreateQuotationItemInput[];
}

// ---------- 受注 ----------

export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'partially_delivered' | 'delivered' | 'completed' | 'cancelled';

export type OrderType = 'general' | 'repair' | 'machine' | 'small_item';

export interface RepairCustomFields {
  dispatchStaff?: string;        // 出張員
}

export interface MachineCustomFields {
  dimensions?: string;           // 寸法
  subcontractor?: string;        // 外注先
  completionDate?: string;       // 完成日
  deliveryLocation?: string;     // 納品場所
}

export interface SmallItemCustomFields {
  deliveryDestination?: string;  // 納入先
}

export type OrderCustomFields = RepairCustomFields | MachineCustomFields | SmallItemCustomFields | Record<string, never>;

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  general: '一般',
  repair: '修理',
  machine: '機械',
  small_item: '小物',
};

export interface OrderItem {
  id: string;
  sortOrder: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  deliveredQuantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  notes: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  salesNumber: string | null;
  customerId: string;
  customer: Pick<Customer, 'id' | 'name' | 'code'>;
  quotationId: string | null;
  orderDate: string;
  deliveryDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  internalMemo: string | null;
  status: OrderStatus;
  orderType: OrderType;
  customFields: OrderCustomFields | null;
  items: OrderItem[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: Omit<Order, 'items'>[];
  total: number;
}

export interface CreateOrderItemInput {
  productId?: string;
  productCode?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate?: number;
  notes?: string;
}

export interface CreateOrderRequest {
  customerId: string;
  quotationId?: string;
  orderDate: string;
  deliveryDate?: string;
  notes?: string;
  internalMemo?: string;
  orderType?: OrderType;
  customFields?: OrderCustomFields;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderRequest {
  customerId?: string;
  orderDate?: string;
  deliveryDate?: string;
  notes?: string;
  internalMemo?: string;
  orderType?: OrderType;
  customFields?: OrderCustomFields;
  items?: CreateOrderItemInput[];
}

// ---------- 納品書 ----------

export type DeliveryNoteStatus = 'draft' | 'issued' | 'delivered' | 'confirmed';

export interface DeliveryNoteItem {
  id: string;
  orderItemId: string | null;
  sortOrder: number;
  productId: string | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  notes: string | null;
}

export interface DeliveryNote {
  id: string;
  deliveryNumber: string;
  orderId: string;
  order: Pick<Order, 'id' | 'orderNumber' | 'salesNumber'>;
  customerId: string;
  customer: Pick<Customer, 'id' | 'name' | 'code'>;
  deliveryDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  status: DeliveryNoteStatus;
  items: DeliveryNoteItem[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryNotesResponse {
  deliveryNotes: Omit<DeliveryNote, 'items'>[];
  total: number;
}

// ---------- 請求書 ----------

export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  deliveryNoteId: string | null;
  orderId: string | null;
  sortOrder: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  notes: string | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdByName: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: Pick<Customer, 'id' | 'name' | 'code'>;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  status: InvoiceStatus;
  items: InvoiceItem[];
  payments: Payment[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesResponse {
  invoices: Omit<Invoice, 'items' | 'payments'>[];
  total: number;
}

// ---------- 外部共有リンク ----------

export type SharedLinkType = 'quotation' | 'order' | 'delivery_note' | 'invoice' | 'report';

export interface SharedLink {
  id: string;
  token: string;
  linkType: SharedLinkType;
  targetId: string;
  expiresAt: string;
  isActive: boolean;
  canApprove: boolean;
  approvedAt: string | null;
  approvedByName: string | null;
  approvalComment: string | null;
  rejectedAt: string | null;
  rejectedByName: string | null;
  rejectionComment: string | null;
  createdByName: string;
  createdAt: string;
}

export interface SharedLinkResponse {
  link: SharedLink;
  url: string;
}

export interface ApprovalLog {
  id: string;
  linkType: SharedLinkType;
  targetId: string;
  action: 'approved' | 'rejected';
  actorName: string;
  comment: string | null;
  createdAt: string;
}

export interface ApprovalLogsResponse {
  logs: ApprovalLog[];
}

// ---------- ダッシュボード ----------

export interface DashboardSummary {
  totalSales: number;
  orderCount: number;
  avgOrderAmount: number;
  receivableAmount: number;
  receivableCount: number;
  monthlySales: number;
  monthlyOrderCount: number;
}

export interface DailySales {
  date: string;
  sales: number;
  count: number;
}

export interface MonthlySales {
  month: string;
  sales: number;
  count: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  customerCode: string;
  totalSales: number;
  orderCount: number;
}

export interface TopProduct {
  productName: string;
  productCode: string;
  totalAmount: number;
  totalQuantity: number;
  orderCount: number;
}

export interface Receivable {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  createdAt: string;
}

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface DashboardSalesResponse {
  daily: DailySales[];
  monthly: MonthlySales[];
}

export interface DashboardRankingsResponse {
  customers: TopCustomer[];
  products: TopProduct[];
}

// ---------- AI分析 ----------

export interface AiAnalysisResult {
  analysis: string;
  generatedAt: string;
  dataRange: { from: string; to: string };
}

// ---------- AI サジェスト ----------

export interface AutoSuggestion {
  id: string;
  type: 'create_delivery_note' | 'create_invoice' | 'follow_up';
  title: string;
  description: string;
  targetType: 'order' | 'delivery_note' | 'customer';
  targetId: string;
  targetLabel: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AutoSuggestionsResponse {
  suggestions: AutoSuggestion[];
}

export interface OrderSuggestion {
  customerId: string;
  customerName: string;
  topProducts: {
    productId: string;
    productName: string;
    avgQuantity: number;
    frequency: number;
    lastOrdered: string;
  }[];
  avgOrderInterval: number | null;
  lastOrderDate: string | null;
  anomalyWarning?: string;
}

export interface OrderSuggestionsResponse {
  suggestion: OrderSuggestion | null;
}

// ---------- OCR注文書抽出 ----------

export interface OcrExtractedItem {
  productName: string;
  productCode?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  matchedProductId?: string;
  matchedProductName?: string;
  matchConfidence?: number;
}

export interface OcrExtractedData {
  customerName?: string;
  customerCode?: string;
  orderDate?: string;
  items: OcrExtractedItem[];
  notes?: string;
  rawText?: string;
}

export interface OcrExtraction {
  id: string;
  sourceImageUrl: string;
  sourceType: 'fax' | 'email' | 'upload';
  extractedData: OcrExtractedData | null;
  matchedCustomerId: string | null;
  matchedCustomerName: string | null;
  matchConfidence: number | null;
  status: 'pending' | 'extracting' | 'extracted' | 'reviewed' | 'converted' | 'error';
  errorMessage: string | null;
  convertedOrderId: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface OcrExtractionsResponse {
  extractions: OcrExtraction[];
  total: number;
}

export interface UpdateOcrExtractionRequest {
  extractedData?: OcrExtractedData;
  matchedCustomerId?: string;
  status?: OcrExtraction['status'];
}
