'use client';

import { useState } from 'react';
import type { DocumentTag } from '@/types';

const TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6B7280',
];

interface DocumentTagManagerProps {
  tags: DocumentTag[];
  onClose: () => void;
  onCreate: (data: { name: string; slug: string; color: string }) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentTagManager({ tags, onClose, onCreate, onUpdate, onDelete }: DocumentTagManagerProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf-]/g, '');
      await onCreate({ name: newName.trim(), slug: slug || `tag-${Date.now()}`, color: newColor });
      setNewName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onUpdate(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このタグを削除しますか？') || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDelete(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">タグ管理</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {/* New tag form */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-colors ${
                    newColor === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="新しいタグ名"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isSubmitting}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              追加
            </button>
          </div>

          {/* Existing tags */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50">
                {editingId === tag.id ? (
                  <>
                    <div className="flex gap-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-4 h-4 rounded-full border-2 ${
                            editColor === color ? 'border-gray-900' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => handleUpdate(tag.id)}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="flex-1 text-sm text-gray-700">{tag.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </>
                )}
              </div>
            ))}
            {tags.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                タグがまだありません
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
