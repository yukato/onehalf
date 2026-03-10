'use client';

import { useState } from 'react';
import type { OcrExtraction, OcrExtractedData, OcrExtractedItem } from '@/types';

interface OcrReviewFormProps {
  extraction: OcrExtraction;
  onSave: (data: { extractedData: OcrExtractedData; matchedCustomerId?: string; matchedCustomerName?: string }) => Promise<void>;
  onConvert: () => Promise<void>;
  onClose: () => void;
}

export function OcrReviewForm({ extraction, onSave, onConvert, onClose }: OcrReviewFormProps) {
  const [data, setData] = useState<OcrExtractedData>(
    extraction.extractedData || { items: [] }
  );
  const [matchedCustomerId, setMatchedCustomerId] = useState(extraction.matchedCustomerId || '');
  const [matchedCustomerName, setMatchedCustomerName] = useState(extraction.matchedCustomerName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const canConvert = extraction.status === 'extracted' || extraction.status === 'reviewed';
  const isConverted = extraction.status === 'converted';

  const handleItemChange = (index: number, field: keyof OcrExtractedItem, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    setData({ ...data, items: newItems });
  };

  const handleAddItem = () => {
    setData({
      ...data,
      items: [...data.items, { productName: '', quantity: 1 }],
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        extractedData: data,
        matchedCustomerId: matchedCustomerId || undefined,
        matchedCustomerName: matchedCustomerName || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!confirm('この抽出データを受注に変換しますか？')) return;
    setIsConverting(true);
    try {
      await onConvert();
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-10">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">OCR抽出データ確認</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Image */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">元画像</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={extraction.sourceImageUrl}
                  alt="注文書"
                  className="w-full h-auto"
                />
              </div>
              {extraction.errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {extraction.errorMessage}
                </div>
              )}
            </div>

            {/* Right: Extracted Data */}
            <div className="space-y-4">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">取引先名</label>
                <input
                  type="text"
                  value={data.customerName || ''}
                  onChange={(e) => setData({ ...data, customerName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="取引先名"
                  disabled={isConverted}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">取引先コード</label>
                  <input
                    type="text"
                    value={data.customerCode || ''}
                    onChange={(e) => setData({ ...data, customerCode: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="取引先コード"
                    disabled={isConverted}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">注文日</label>
                  <input
                    type="date"
                    value={data.orderDate || ''}
                    onChange={(e) => setData({ ...data, orderDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isConverted}
                  />
                </div>
              </div>

              {/* Matched customer info */}
              {matchedCustomerName && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-700 font-medium">
                      マスタ取引先: {matchedCustomerName}
                    </span>
                    {extraction.matchConfidence !== null && (
                      <span className="text-xs text-green-600">
                        (一致度: {Math.round(extraction.matchConfidence * 100)}%)
                      </span>
                    )}
                  </div>
                  <input
                    type="hidden"
                    value={matchedCustomerId}
                  />
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">商品明細</label>
                  {!isConverted && (
                    <button
                      onClick={handleAddItem}
                      className="text-xs text-primary hover:underline"
                    >
                      + 行を追加
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">商品名</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">数量</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-16">単位</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-24">単価</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">マッチ</th>
                        {!isConverted && <th className="w-8"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(i, 'productName', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={isConverted}
                            />
                            {item.matchedProductName && (
                              <div className="text-xs text-green-600 mt-0.5">
                                → {item.matchedProductName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(i, 'quantity', Number(e.target.value))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={isConverted}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.unit || ''}
                              onChange={(e) => handleItemChange(i, 'unit', e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={isConverted}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unitPrice ?? ''}
                              onChange={(e) => handleItemChange(i, 'unitPrice', Number(e.target.value))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                              disabled={isConverted}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.matchConfidence !== undefined && item.matchConfidence !== null ? (
                              <span className={`text-xs ${item.matchConfidence >= 0.8 ? 'text-green-600' : item.matchConfidence >= 0.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {Math.round(item.matchConfidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          {!isConverted && (
                            <td className="px-1 py-2">
                              <button
                                onClick={() => handleRemoveItem(i)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {data.items.length === 0 && (
                        <tr>
                          <td colSpan={isConverted ? 5 : 6} className="px-3 py-4 text-center text-sm text-gray-400">
                            商品が抽出されていません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                <textarea
                  value={data.notes || ''}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                  disabled={isConverted}
                />
              </div>

              {isConverted && extraction.convertedOrderId && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700">
                  受注に変換済み (受注ID: {extraction.convertedOrderId})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
          >
            閉じる
          </button>
          {!isConverted && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-white bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '修正を保存'}
              </button>
              {canConvert && matchedCustomerId && data.items.length > 0 && (
                <button
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="px-4 py-2 text-sm text-white bg-primary rounded hover:opacity-90 disabled:opacity-50"
                >
                  {isConverting ? '変換中...' : '受注に変換'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
