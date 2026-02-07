'use client';

import type { DocumentTag } from '@/types';

interface DocumentTagFilterProps {
  tags: DocumentTag[];
  selectedTagId: string | null;
  onSelect: (tagId: string | null) => void;
  onManageTags: () => void;
}

export function DocumentTagFilter({ tags, selectedTagId, onSelect, onManageTags }: DocumentTagFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
          selectedTagId === null
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        }`}
      >
        すべて
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelect(tag.id)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5 ${
            selectedTagId === tag.id
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedTagId === tag.id ? 'white' : tag.color }}
          />
          {tag.name}
        </button>
      ))}
      <button
        onClick={onManageTags}
        className="px-3 py-1.5 text-sm rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
      >
        + タグ管理
      </button>
    </div>
  );
}
