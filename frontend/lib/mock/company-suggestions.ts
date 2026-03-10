import type { AutoSuggestionsResponse, OrderSuggestionsResponse, AiAnalysisResult } from '@/types';

export const mockAutoSuggestionsResponse: AutoSuggestionsResponse = {
  suggestions: [
    {
      id: '1',
      type: 'create_delivery_note',
      title: '納品書の作成',
      description: 'ORD-2026-0142 (株式会社大阪グランドホテル) は確定済みです。納品書を作成しませんか？',
      targetType: 'order',
      targetId: '142',
      targetLabel: 'ORD-2026-0142',
      priority: 'high',
    },
    {
      id: '2',
      type: 'create_invoice',
      title: '請求書の作成',
      description: 'DN-2026-0025 (天満屋フードサービス株式会社) は発行済みです。請求書を作成しませんか？',
      targetType: 'delivery_note',
      targetId: '1',
      targetLabel: 'DN-2026-0025',
      priority: 'medium',
    },
    {
      id: '3',
      type: 'follow_up',
      title: 'フォローアップ推奨',
      description: '株式会社なにわ食品への最終受注から30日以上経過しています。',
      targetType: 'customer',
      targetId: '3',
      targetLabel: '株式会社なにわ食品',
      priority: 'low',
    },
  ],
};

export const mockOrderSuggestionsResponse: OrderSuggestionsResponse = {
  suggestion: {
    customerId: '1',
    customerName: '株式会社大阪グランドホテル',
    topProducts: [
      {
        productId: '1',
        productName: 'ステンレス作業台 1200mm',
        avgQuantity: 2,
        frequency: 5,
        lastOrdered: '2026-02-28',
      },
      {
        productId: '5',
        productName: 'シンク 2槽式 900mm',
        avgQuantity: 1,
        frequency: 3,
        lastOrdered: '2026-02-28',
      },
    ],
    avgOrderInterval: 14,
    lastOrderDate: '2026-02-28',
  },
};

export const mockAiAnalysisResult: AiAnalysisResult = {
  analysis: `## 売上分析サマリー

### 全体傾向
2月の売上は4,820,000円（23件）で、前月比7.8%減少しています。ただし、平均受注単価は209,565円と前月比5.2%上昇しており、大型案件の比率が増えています。

### 取引先分析
- **株式会社大阪グランドホテル** が引き続きトップ顧客（累計4,850,000円）
- **天満屋フードサービス** の受注頻度が増加傾向（月4件→5件）
- **有限会社堺水産市場** に未収金あり（340,000円、期限超過）。早期回収を推奨

### 商品分析
- ステンレス作業台の需要が安定（月間5-6台）
- スチームコンベクションオーブンの引き合いが増加中

### 推奨アクション
1. 堺水産市場への未収金回収フォロー
2. なにわ食品への厨房改装案件の進捗確認
3. 京都料亭まつおかへの追加提案（厨房改装プランQT-0016のフォロー）`,
  generatedAt: '2026-03-01T08:00:00.000Z',
  dataRange: { from: '2026-02-01', to: '2026-02-28' },
};
