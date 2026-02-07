'use client';

import { useState, useCallback } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  onUrlSubmit?: (url: string) => Promise<void>;
  accept?: string;
  maxSize?: number; // MB
  isUploading?: boolean;
  allowUrl?: boolean;
  placeholder?: string;
}

export function FileUpload({
  onUpload,
  onUrlSubmit,
  accept = '*/*',
  maxSize = 50,
  isUploading = false,
  allowUrl = false,
  placeholder = 'クリックまたはドラッグ&ドロップ',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > maxSize * 1024 * 1024) {
        setError(`ファイルサイズは${maxSize}MB以下にしてください`);
        return;
      }

      try {
        await onUpload(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      }
    },
    [maxSize, onUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleUrlSubmit = async () => {
    if (!urlInput.trim() || !onUrlSubmit) return;

    setError(null);
    try {
      await onUrlSubmit(urlInput.trim());
      setUrlInput('');
      setIsUrlMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL登録に失敗しました');
    }
  };

  // URL入力モード
  if (isUrlMode && allowUrl) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || isUploading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? '登録中...' : '登録'}
          </button>
        </div>
        <button
          onClick={() => setIsUrlMode(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← ファイルアップロードに戻る
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // ファイルアップロードモード
  return (
    <div className="space-y-2">
      <label
        className="block"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="text-center">
            <svg
              className={`mx-auto h-6 w-6 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className={`mt-1 text-sm ${isDragging ? 'text-blue-600' : 'text-gray-500'}`}>
              {isDragging ? 'ドロップして追加' : placeholder}
            </p>
          </div>
        </div>
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </label>

      {allowUrl && (
        <button
          onClick={() => setIsUrlMode(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          URLで登録する →
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
