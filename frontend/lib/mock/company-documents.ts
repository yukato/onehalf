import type { DocumentItem, DocumentTag, DocumentsResponse, DocumentTagsResponse, LlmSettingsResponse } from '@/types';

export const mockDocumentTags: DocumentTag[] = [
  { id: '1', name: '契約書', slug: 'contract', color: '#3B82F6' },
  { id: '2', name: '取扱説明書', slug: 'manual', color: '#10B981' },
  { id: '3', name: '仕様書', slug: 'spec', color: '#F59E0B' },
  { id: '4', name: '社内規定', slug: 'policy', color: '#8B5CF6' },
];

export const mockDocuments: DocumentItem[] = [
  {
    id: '1',
    title: '業務用冷蔵庫メンテナンスマニュアル',
    originalName: 'maintenance_manual_refrigerator.pdf',
    mimeType: 'application/pdf',
    size: 2450000,
    s3Url: '#',
    uploadedByName: '八木厨房 管理者',
    status: 'ready',
    errorMessage: null,
    pageCount: 24,
    tags: [mockDocumentTags[1]],
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-02-15T10:30:00.000Z',
  },
  {
    id: '2',
    title: '食品衛生法対応ガイドライン',
    originalName: 'food_hygiene_guideline.pdf',
    mimeType: 'application/pdf',
    size: 1850000,
    s3Url: '#',
    uploadedByName: '田中 太郎',
    status: 'ready',
    errorMessage: null,
    pageCount: 18,
    tags: [mockDocumentTags[3]],
    createdAt: '2026-02-10T14:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  },
  {
    id: '3',
    title: '厨房機器納品仕様書テンプレート',
    originalName: 'delivery_spec_template.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 520000,
    s3Url: '#',
    uploadedByName: '八木厨房 管理者',
    status: 'ready',
    errorMessage: null,
    pageCount: 6,
    tags: [mockDocumentTags[2]],
    createdAt: '2026-01-20T09:00:00.000Z',
    updatedAt: '2026-01-20T09:15:00.000Z',
  },
  {
    id: '4',
    title: '年間保守契約書ひな形',
    originalName: 'annual_maintenance_contract.pdf',
    mimeType: 'application/pdf',
    size: 980000,
    s3Url: '#',
    uploadedByName: '八木厨房 管理者',
    status: 'ready',
    errorMessage: null,
    pageCount: 8,
    tags: [mockDocumentTags[0], mockDocumentTags[3]],
    createdAt: '2026-01-15T11:00:00.000Z',
    updatedAt: '2026-01-15T11:20:00.000Z',
  },
];

export const mockDocumentsResponse: DocumentsResponse = {
  documents: mockDocuments,
  total: mockDocuments.length,
};

export const mockDocumentTagsResponse: DocumentTagsResponse = {
  tags: mockDocumentTags,
};

export const mockLlmSettingsResponse: LlmSettingsResponse = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  hasAnthropicKey: true,
  hasOpenaiKey: false,
  embeddingModel: 'intfloat/multilingual-e5-small',
  availableModels: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { provider: 'anthropic', model: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' },
    { provider: 'openai', model: 'gpt-4o-mini', name: 'GPT-4o mini' },
  ],
};
