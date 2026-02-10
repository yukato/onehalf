'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { companyApi } from '@/lib/company-api';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { Customer, Product, CreateQuotationItemInput } from '@/types';

interface QuotationFormProps {
  onSave: () => void;
  onClose: () => void;
}

interface FormItem {
  key: number;
  productId?: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
}

let nextKey = 1;

function emptyItem(): FormItem {
  return {
    key: nextKey++,
    productCode: '',
    productName: '',
    quantity: 1,
    unit: '個',
    unitPrice: 0,
    taxRate: 10,
  };
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function QuotationForm({ onSave, onClose }: QuotationFormProps) {
  // Customer search
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Fields
  const [subject, setSubject] = useState('');
  const [quotationDate, setQuotationDate] = useState(todayString());
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [internalMemo, setInternalMemo] = useState('');

  // Items
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);

  // Product search per row
  const [productSearchIndex, setProductSearchIndex] = useState<number | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const productDropdownRef = useRef<HTMLTableCellElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductSearchIndex(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Customer search
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerResults([]); return; }
    try {
      const res = await companyApi.getCustomers({ q, limit: 10 });
      setCustomerResults(res.customers);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerQuery), 300);
    return () => clearTimeout(timer);
  }, [customerQuery, searchCustomers]);

  // Product search
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    try {
      const res = await companyApi.getProducts({ q, limit: 10 });
      setProductResults(res.products);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productQuery), 300);
    return () => clearTimeout(timer);
  }, [productQuery, searchProducts]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setShowCustomerDropdown(false);
  };

  const selectProduct = (product: Product, index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              productId: product.id,
              productCode: product.code,
              productName: product.name,
              unit: product.unit,
              unitPrice: product.unitPrice,
              taxRate: product.taxRate,
            }
          : item
      )
    );
    setProductSearchIndex(null);
    setProductQuery('');
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + Math.floor(item.quantity * item.unitPrice * item.taxRate / 100), 0);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setError('取引先を選択してください');
      return;
    }
    if (items.some((item) => !item.productName.trim())) {
      setError('全ての明細行に商品名を入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const itemsData: CreateQuotationItemInput[] = items.map((item) => ({
        productId: item.productId || undefined,
        productCode: item.productCode || undefined,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit || undefined,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      }));

      await companyApi.createQuotation({
        customerId: selectedCustomer.id,
        subject: subject || undefined,
        quotationDate,
        validUntil: validUntil || undefined,
        notes: notes || undefined,
        internalMemo: internalMemo || undefined,
        items: itemsData,
      });

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">見積書を新規作成</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Customer search */}
          <div ref={customerRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              取引先 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); setSelectedCustomer(null); }}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="取引先名で検索..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {showCustomerDropdown && customerResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    <span className="font-mono text-gray-400 mr-2">{c.code}</span>
                    <span className="text-gray-900">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject + Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="見積の件名..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                見積日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">有効期限</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">明細行</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">商品名</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-20">数量</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-16">単位</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-28">単価</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-28">金額</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.key} className={index % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="px-3 py-2 relative" ref={productSearchIndex === index ? productDropdownRef : undefined}>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            updateItem(index, 'productName', e.target.value);
                            setProductQuery(e.target.value);
                            setProductSearchIndex(index);
                          }}
                          onFocus={() => {
                            setProductSearchIndex(index);
                            if (item.productName) {
                              setProductQuery(item.productName);
                            }
                          }}
                          placeholder="商品を検索..."
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        {productSearchIndex === index && productResults.length > 0 && (
                          <div className="absolute z-20 left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {productResults.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => selectProduct(p, index)}
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              >
                                <span className="font-mono text-gray-400 mr-2">{p.code}</span>
                                <span className="text-gray-900">{p.name}</span>
                                <span className="text-gray-400 ml-2">({formatCurrency(p.unitPrice)}/{p.unit})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700 font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-2 py-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="px-3 py-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  行を追加
                </button>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-3">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">小計</span>
                  <span className="text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">消費税</span>
                  <span className="text-gray-900">{formatCurrency(Math.round(taxAmount))}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold">
                  <span className="text-gray-700">合計</span>
                  <span className="text-gray-900">{formatCurrency(Math.round(totalAmount))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">社内メモ</label>
            <textarea
              value={internalMemo}
              onChange={(e) => setInternalMemo(e.target.value)}
              rows={2}
              placeholder="社内向けのメモ（見積書には印刷されません）"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
