'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { companyApi } from '@/lib/company-api';
import { formatCurrency } from '@/components/ui/AmountDisplay';
import type { Customer, Product, Quotation, CreateQuotationItemInput, CostPart } from '@/types';

interface QuotationFormProps {
  initialData?: Quotation;
  onSave: () => void;
  onClose: () => void;
}

interface FormCostPart {
  key: number;
  name: string;
  unitPrice: number;
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
  costParts: FormCostPart[];
  showCostDetail: boolean;
}

let nextKey = 1;
let nextCostPartKey = 1;

function emptyCostPart(): FormCostPart {
  return { key: nextCostPartKey++, name: '', unitPrice: 0 };
}

function emptyItem(): FormItem {
  return {
    key: nextKey++,
    productCode: '',
    productName: '',
    quantity: 1,
    unit: '個',
    unitPrice: 0,
    taxRate: 10,
    costParts: [{ key: nextCostPartKey++, name: '', unitPrice: 0 }],
    showCostDetail: false,
  };
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCostTotal(item: FormItem): number {
  return item.costParts.reduce((sum, p) => sum + p.unitPrice, 0);
}

export function QuotationForm({ initialData, onSave, onClose }: QuotationFormProps) {
  const isEdit = !!initialData;

  // Customer search
  const [customerQuery, setCustomerQuery] = useState(initialData?.customer.name ?? '');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialData ? { id: initialData.customerId, name: initialData.customer.name, code: initialData.customer.code } as Customer : null
  );
  const customerRef = useRef<HTMLDivElement>(null);

  // Fields
  const [subject, setSubject] = useState(initialData?.subject ?? '');
  const [quotationDate, setQuotationDate] = useState(initialData?.quotationDate ?? todayString());
  const [validUntil, setValidUntil] = useState(initialData?.validUntil ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [internalMemo, setInternalMemo] = useState(initialData?.internalMemo ?? '');

  // Items
  const [items, setItems] = useState<FormItem[]>(
    initialData?.items.length
      ? initialData.items.map((item) => ({
          key: nextKey++,
          productId: item.productId ?? undefined,
          productCode: item.productCode ?? '',
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          costParts: item.costParts?.length
            ? item.costParts.map((cp) => ({ key: nextCostPartKey++, name: cp.name, unitPrice: cp.unitPrice }))
            : [{ key: nextCostPartKey++, name: '', unitPrice: item.costPrice || 0 }],
          showCostDetail: false,
        }))
      : [emptyItem()]
  );

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
    try {
      const res = await companyApi.getCustomers({ q: q.trim() || undefined, limit: 10 });
      setCustomerResults(res.customers);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerQuery), 300);
    return () => clearTimeout(timer);
  }, [customerQuery, searchCustomers]);

  // Product search
  const searchProducts = useCallback(async (q: string) => {
    try {
      const res = await companyApi.getProducts({ q: q.trim() || undefined, limit: 10 });
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
              costParts: [{ key: nextCostPartKey++, name: product.name, unitPrice: product.costPrice }],
            }
          : item
      )
    );
    setProductSearchIndex(null);
    setProductQuery('');
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number | boolean) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const updateCostPart = (itemIndex: number, partIndex: number, field: 'name' | 'unitPrice', value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        const newParts = item.costParts.map((p, pi) =>
          pi === partIndex ? { ...p, [field]: value } : p
        );
        return { ...item, costParts: newParts };
      })
    );
  };

  const addCostPart = (itemIndex: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, costParts: [...item.costParts, emptyCostPart()] } : item
      )
    );
  };

  const removeCostPart = (itemIndex: number, partIndex: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex || item.costParts.length <= 1) return item;
        return { ...item, costParts: item.costParts.filter((_, pi) => pi !== partIndex) };
      })
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
  const totalCost = items.reduce((sum, item) => sum + item.quantity * getCostTotal(item), 0);
  const totalProfit = subtotal - totalCost;

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
        costPrice: getCostTotal(item),
        costParts: item.costParts
          .filter((p) => p.name || p.unitPrice)
          .map((p) => ({ name: p.name, unitPrice: p.unitPrice })),
        taxRate: item.taxRate,
      }));

      if (isEdit && initialData) {
        await companyApi.updateQuotation(initialData.id, {
          customerId: selectedCustomer.id,
          subject: subject || undefined,
          quotationDate,
          validUntil: validUntil || undefined,
          notes: notes || undefined,
          internalMemo: internalMemo || undefined,
          items: itemsData,
        });
      } else {
        await companyApi.createQuotation({
          customerId: selectedCustomer.id,
          subject: subject || undefined,
          quotationDate,
          validUntil: validUntil || undefined,
          notes: notes || undefined,
          internalMemo: internalMemo || undefined,
          items: itemsData,
        });
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? '見積書を編集' : '見積書を新規作成'}</h3>
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
              onFocus={() => { setShowCustomerDropdown(true); searchCustomers(customerQuery); }}
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
            <div className="border border-gray-200 rounded-lg overflow-visible">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">商品名</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-16">数量</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 w-20">単位</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-24">単価</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-24">金額</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-24">
                      <span className="text-orange-600">原価</span>
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 w-24">
                      <span className="text-emerald-600">利益</span>
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = item.quantity * item.unitPrice;
                    const costTotal = getCostTotal(item);
                    const costAmount = item.quantity * costTotal;
                    const profit = amount - costAmount;
                    const profitRate = amount > 0 ? (profit / amount * 100) : 0;

                    return (
                      <tr key={item.key} className={`border-t border-gray-100 ${index % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
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
                              setProductQuery(item.productName);
                              searchProducts(item.productName);
                            }}
                            placeholder="商品を検索..."
                            className={inputClass}
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
                                  {p.costPrice > 0 && (
                                    <span className="text-orange-500 ml-1">原価{formatCurrency(p.costPrice)}</span>
                                  )}
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
                            className={`${inputClass} text-right`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className={inputClass}
                          >
                            <option value="個">個</option>
                            <option value="台">台</option>
                            <option value="式">式</option>
                            <option value="セット">セット</option>
                            <option value="本">本</option>
                            <option value="枚">枚</option>
                            <option value="箱">箱</option>
                            <option value="kg">kg</option>
                            <option value="m">m</option>
                            <option value="時間">時間</option>
                            <option value="人工">人工</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`${inputClass} text-right`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700 font-medium whitespace-nowrap">
                          {formatCurrency(amount)}
                        </td>
                        {/* 原価セル */}
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-right text-orange-700 font-medium flex-1 whitespace-nowrap">
                              {formatCurrency(costAmount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'showCostDetail', !item.showCostDetail)}
                              className="p-0.5 text-gray-400 hover:text-orange-600 shrink-0"
                              title="原価内訳"
                            >
                              <svg className={`w-3.5 h-3.5 transition-transform ${item.showCostDetail ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          {/* 原価内訳（展開時） */}
                          {item.showCostDetail && (
                            <div className="mt-2 space-y-1 border-t border-orange-100 pt-2">
                              {item.costParts.map((part, pi) => (
                                <div key={part.key} className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={part.name}
                                    onChange={(e) => updateCostPart(index, pi, 'name', e.target.value)}
                                    placeholder="部品名"
                                    className="flex-1 min-w-0 rounded border border-orange-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={part.unitPrice}
                                    onChange={(e) => updateCostPart(index, pi, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-20 rounded border border-orange-200 px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                                  />
                                  {item.costParts.length > 1 && (
                                    <button type="button" onClick={() => removeCostPart(index, pi)} className="text-gray-300 hover:text-red-400">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addCostPart(index)}
                                className="text-xs text-orange-500 hover:text-orange-700 flex items-center gap-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                部品追加
                              </button>
                            </div>
                          )}
                        </td>
                        {/* 利益セル */}
                        <td className="px-3 py-2 text-sm text-right align-top whitespace-nowrap">
                          <div className={`font-medium ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {formatCurrency(profit)}
                          </div>
                          {amount > 0 && (
                            <div className={`text-xs ${profit >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {profitRate.toFixed(1)}%
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
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
                    );
                  })}
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
              <div className="w-80 space-y-1 text-sm">
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
                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                  <span className="text-orange-600">原価合計</span>
                  <span className="text-orange-700 font-medium">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">粗利</span>
                  <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit)}
                    {subtotal > 0 && (
                      <span className="text-xs font-normal ml-1">({(totalProfit / subtotal * 100).toFixed(1)}%)</span>
                    )}
                  </span>
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
