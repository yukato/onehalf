'use client';

import { useState, useEffect, useCallback } from 'react';
import { companyApi } from '@/lib/company-api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { SharedLink } from '@/types';

interface ShareLinkModalProps {
  quotationId: string;
  quotationNumber: string;
  onClose: () => void;
  onLinkCreated?: () => void;
}

export function ShareLinkModal({ quotationId, quotationNumber, onClose, onLinkCreated }: ShareLinkModalProps) {
  const [canApprove, setCanApprove] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [isCreating, setIsCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState<SharedLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      const res = await companyApi.getQuotationSharedLinks(quotationId);
      setExistingLinks(res.links);
    } catch { /* ignore */ }
  }, [quotationId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await companyApi.shareQuotation(quotationId, { canApprove, expiresInDays });
      setCreatedUrl(res.url);
      await loadLinks();
      onLinkCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '共有リンクの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const getLinkStatus = (link: SharedLink): string => {
    if (link.approvedAt) return 'approved';
    if (link.rejectedAt) return 'rejected';
    if (!link.isActive) return 'expired';
    if (new Date(link.expiresAt) < new Date()) return 'expired';
    return 'sent';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-10" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            共有リンク — <span className="font-mono">{quotationNumber}</span>
          </h3>
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

          {/* Create new link */}
          {!createdUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={canApprove}
                    onChange={(e) => setCanApprove(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  承認・差戻し操作を許可
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">有効期間</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={7}>7日間</option>
                  <option value={14}>14日間</option>
                  <option value={30}>30日間</option>
                  <option value={60}>60日間</option>
                </select>
              </div>

              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isCreating ? '作成中...' : '共有リンクを発行'}
              </button>
            </div>
          )}

          {/* Created URL */}
          {createdUrl && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">共有URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={createdUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-700"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <button
                onClick={() => setCreatedUrl(null)}
                className="text-sm text-primary hover:text-primary/80"
              >
                別のリンクを発行
              </button>
            </div>
          )}

          {/* Existing links */}
          {existingLinks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">発行済みリンク</h4>
              <div className="space-y-2">
                {existingLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <div className="text-gray-700">
                        {new Date(link.createdAt).toLocaleDateString('ja-JP')} 作成
                      </div>
                      <div className="text-xs text-gray-400">
                        期限: {new Date(link.expiresAt).toLocaleDateString('ja-JP')}
                        {link.canApprove && ' / 承認可'}
                      </div>
                    </div>
                    <StatusBadge status={getLinkStatus(link)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
