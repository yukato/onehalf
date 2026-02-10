'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import type { DocumentItem } from '@/types';

interface DocumentListProps {
  documents: DocumentItem[];
  total: number;
  offset: number;
  limit: number;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
  onEdit: (doc: DocumentItem) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: DocumentItem['status'] }) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          準備完了
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          処理中
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          エラー
        </span>
      );
  }
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') {
    return (
      <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-red-600">PDF</span>
      </div>
    );
  }
  if (mimeType.includes('wordprocessingml')) {
    return (
      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-blue-600">DOC</span>
      </div>
    );
  }
  if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) {
    return (
      <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-green-600">XLS</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-gray-500">TXT</span>
    </div>
  );
}

export function DocumentList({ documents, total, offset, limit, onPageChange, onDelete, onEdit }: DocumentListProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-500">書類がまだありません</p>
        <p className="text-xs text-gray-400 mt-1">ファイルをアップロードして始めましょう</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ファイル名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">タグ</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">サイズ</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ステータス</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">作成日</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileIcon mimeType={doc.mimeType} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{doc.title}</div>
                    {doc.title !== doc.originalName && (
                      <div className="text-xs text-gray-400 truncate">{doc.originalName}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(doc.size)}</td>
              <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(doc.createdAt)}</td>
              <td className="px-4 py-3 text-right relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === doc.id ? null : doc.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpenId === doc.id && (
                  <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-32">
                    <button
                      onClick={() => { setMenuOpenId(null); onEdit(doc); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      編集
                    </button>
                    <a
                      href={doc.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpenId(null)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      ダウンロード
                    </a>
                    <button
                      onClick={() => { setMenuOpenId(null); onDelete(doc.id); }}
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
