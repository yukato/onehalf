import type { OcrExtraction, OcrExtractionsResponse } from '@/types';

export const mockOcrExtractions: OcrExtraction[] = [
  {
    id: '1',
    sourceImageUrl: '#',
    sourceType: 'fax',
    extractedData: {
      customerName: '株式会社大阪グランドホテル',
      customerCode: 'C001',
      orderDate: '2026-03-05',
      items: [
        {
          productName: 'ステンレス作業台',
          productCode: 'P001',
          quantity: 2,
          unit: '台',
          unitPrice: 85000,
          matchedProductId: '1',
          matchedProductName: 'ステンレス作業台 1200mm',
          matchConfidence: 0.92,
        },
      ],
      notes: '3月中旬納品希望',
    },
    matchedCustomerId: '1',
    matchedCustomerName: '株式会社大阪グランドホテル',
    matchConfidence: 0.95,
    status: 'extracted',
    errorMessage: null,
    convertedOrderId: null,
    createdByName: '八木厨房 管理者',
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-03-05T09:05:00.000Z',
  },
  {
    id: '2',
    sourceImageUrl: '#',
    sourceType: 'upload',
    extractedData: {
      customerName: '南海ケータリング',
      items: [
        {
          productName: 'フードカッター',
          quantity: 1,
          unit: '台',
          matchedProductId: '7',
          matchedProductName: 'フードカッター FC-200',
          matchConfidence: 0.88,
        },
      ],
    },
    matchedCustomerId: '4',
    matchedCustomerName: '南海ケータリング株式会社',
    matchConfidence: 0.85,
    status: 'reviewed',
    errorMessage: null,
    convertedOrderId: null,
    createdByName: '田中 太郎',
    createdAt: '2026-03-03T14:00:00.000Z',
    updatedAt: '2026-03-04T10:00:00.000Z',
  },
];

export const mockOcrExtractionsResponse: OcrExtractionsResponse = {
  extractions: mockOcrExtractions,
  total: mockOcrExtractions.length,
};
