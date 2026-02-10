'use client';

import { useState } from 'react';
import type { Product } from '@/types';

interface ProductListProps {
  products: Product[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function formatPrice(price: number): string {
  return `¥${price.toLocaleString()}`;
}

export function ProductList({ products, total, offset, limit, onPageChange, onEdit, onDelete }: ProductListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-sm text-gray-500">商品がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">新規登録またはCSVインポートで追加しましょう</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">コード</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">商品名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">単位</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">単価</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => (
            <tr
              key={product.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onEdit(product)}
            >
              <td className="px-4 py-3 text-sm text-gray-500 font-mono">{product.code}</td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                {product.nameKana && (
                  <div className="text-xs text-gray-400">{product.nameKana}</div>
                )}
              </td>
              <td className="px-4 py-3">
                {product.category ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {product.category.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{product.unit}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-mono">{formatPrice(product.unitPrice)}</td>
              <td className="px-4 py-3 text-right relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === product.id ? null : product.id); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpenId === product.id && (
                  <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-32">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onEdit(product); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(product.id); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {total}件中 {offset + 1}〜{Math.min(offset + limit, total)}件
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={currentPage <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
