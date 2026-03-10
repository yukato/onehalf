'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';

// クロップ後の画像をBlobに変換
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize: { width: number; height: number } = { width: 800, height: 800 }
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize.width,
    outputSize.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      0.9
    );
  });
}

interface FileType {
  value: string;
  label: string;
  accept: string;
  maxSize: number;
  allowUrl: boolean;
}

const FILE_TYPES: FileType[] = [
  { value: 'profile', label: 'プロフィール画像', accept: 'image/*', maxSize: 10, allowUrl: false },
  {
    value: 'interview',
    label: '面談データ',
    accept: 'video/*,audio/*',
    maxSize: 500,
    allowUrl: true,
  },
  { value: 'kyc', label: 'KYC書類', accept: 'image/*,.pdf', maxSize: 20, allowUrl: false },
  {
    value: 'date_hearing',
    label: 'デートヒアリング',
    accept: 'video/*,audio/*',
    maxSize: 500,
    allowUrl: true,
  },
];

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, type: string) => Promise<void>;
  onUrlSubmit: (url: string, type: string) => Promise<void>;
  isUploading: boolean;
  allowedTypes?: string[]; // 許可する種別の配列（指定しない場合は全種別）
}

export function FileUploadModal({
  isOpen,
  onClose,
  onUpload,
  onUrlSubmit,
  isUploading,
  allowedTypes,
}: FileUploadModalProps) {
  // 表示する種別をフィルタリング
  const availableTypes = allowedTypes
    ? FILE_TYPES.filter((t) => allowedTypes.includes(t.value))
    : FILE_TYPES;

  const [selectedType, setSelectedType] = useState<string>(
    availableTypes[0]?.value || FILE_TYPES[0].value
  );

  // モーダルが開いたときに選択をリセット
  useEffect(() => {
    if (isOpen) {
      setSelectedType(availableTypes[0]?.value || FILE_TYPES[0].value);
    }
  }, [isOpen, availableTypes]);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // クロップ関連の状態
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const currentFileType = FILE_TYPES.find((t) => t.value === selectedType) || FILE_TYPES[0];

  const handleClose = () => {
    if (isUploading) return;
    setSelectedType(availableTypes[0]?.value || FILE_TYPES[0].value);
    setIsUrlMode(false);
    setUrlInput('');
    setError(null);
    // クロップ状態をリセット
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > currentFileType.maxSize * 1024 * 1024) {
        setError(`ファイルサイズは${currentFileType.maxSize}MB以下にしてください`);
        return;
      }

      // プロフィール画像の場合はクロップUIを表示
      if (selectedType === 'profile' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }

      // その他のファイルは直接アップロード
      try {
        await onUpload(file, selectedType);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
      }
    },
    [currentFileType.maxSize, onUpload, selectedType]
  );

  // クロップ後のアップロード処理
  const handleCropUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setError(null);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], 'image.jpg', { type: 'image/jpeg' });
      await onUpload(file, selectedType);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    }
  };

  // クロップをキャンセル
  const handleCropCancel = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
    if (!urlInput.trim()) return;

    setError(null);
    try {
      await onUrlSubmit(urlInput.trim(), selectedType);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL登録に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-10"
      onClick={imageSrc ? undefined : handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {availableTypes.length === 1 ? `${availableTypes[0].label}を追加` : 'ファイルを追加'}
            </h3>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-4">
          {/* 種別選択（複数種別がある場合のみ表示） */}
          {availableTypes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">種別</label>
              <div className="flex gap-2">
                {availableTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedType(type.value);
                      setIsUrlMode(false);
                      setError(null);
                    }}
                    disabled={isUploading}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedType === type.value
                        ? 'bg-primary-manilla/30 border-primary text-primary-dark'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* クロップモード（プロフィール画像用） */}
          {imageSrc ? (
            <div className="space-y-4">
              <div className="relative h-64 bg-gray-900 rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 whitespace-nowrap">ズーム</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCropCancel}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  やり直す
                </button>
                <button
                  onClick={handleCropUpload}
                  disabled={isUploading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isUploading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark'
                  }`}
                >
                  {isUploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>
            </div>
          ) : isUrlMode && currentFileType.allowUrl ? (
            /* URL入力モード */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cloud-light/50 focus:border-cloud-light"
                  disabled={isUploading}
                />
              </div>
              <button
                onClick={() => setIsUrlMode(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← ファイルアップロードに戻る
              </button>
            </div>
          ) : (
            /* ファイルアップロードモード */
            <div className="space-y-3">
              <label
                className="block"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <svg
                    className={`h-10 w-10 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
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
                  <p className={`text-sm ${isDragging ? 'text-blue-600' : 'text-gray-500'}`}>
                    {isDragging ? 'ドロップして追加' : 'クリックまたはドラッグ&ドロップ'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">最大 {currentFileType.maxSize}MB</p>
                </div>
                <input
                  type="file"
                  accept={currentFileType.accept}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              {currentFileType.allowUrl && (
                <button
                  onClick={() => setIsUrlMode(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  URLで登録する →
                </button>
              )}
            </div>
          )}

          {/* エラー表示 */}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* フッター（URL入力時のみ） */}
        {isUrlMode && currentFileType.allowUrl && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || isUploading}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? '登録中...' : '登録'}
            </button>
          </div>
        )}

        {/* アップロード中の表示 */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium">アップロード中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
