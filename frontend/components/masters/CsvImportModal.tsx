'use client';

import { useState, useRef, useCallback } from 'react';
import { companyApi } from '@/lib/company-api';
import type { CsvImportResult } from '@/types';

interface CsvImportModalProps {
  type: 'customers' | 'products';
  onComplete: () => void;
  onClose: () => void;
}

export function CsvImportModal({ type, onComplete, onClose }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = type === 'customers' ? '取引先' : '商品';

  const parsePreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      const rows = lines.slice(0, 6).map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
      setPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx?)$/i)) {
      setError('CSVまたはExcelファイルを選択してください');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    if (selectedFile.name.endsWith('.csv')) {
      parsePreview(selectedFile);
    } else {
      setPreview([]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError(null);

    try {
      let importResult: CsvImportResult;
      if (type === 'customers') {
        importResult = await companyApi.importCustomers(file);
      } else {
        importResult = await companyApi.importProducts(file);
      }
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'インポートに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{label}のCSVインポート</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Result */}
          {result ? (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">インポート完了</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p>取り込み: {result.imported}件</p>
                  <p>スキップ: {result.skipped}件</p>
                  {result.errors.length > 0 && (
                    <p className="text-red-600">エラー: {result.errors.length}件</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2">エラー詳細</h4>
                  <div className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i}>行 {err.row}: {err.message}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={onComplete}
                  className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : file
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">クリックして別のファイルを選択</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="text-sm text-gray-600">ファイルをドラッグ＆ドロップ</p>
                    <p className="text-xs text-gray-400 mt-1">またはクリックしてファイルを選択（CSV, Excel）</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">プレビュー（先頭5行）</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-xs">
                      <tbody className="divide-y divide-gray-100">
                        {preview.map((row, i) => (
                          <tr key={i} className={i === 0 ? 'bg-gray-50 font-medium' : ''}>
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || isImporting}
                  className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
                >
                  {isImporting ? 'インポート中...' : 'インポート実行'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
