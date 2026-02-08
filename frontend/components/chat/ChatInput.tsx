'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** プレビューモード（SP向けスタイル） */
  isPreview?: boolean;
}

export function ChatInput({ onSubmit, placeholder, disabled, isPreview }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // SP: 5行分(約120px)、PC: 200px
      const maxHeight = window.innerWidth < 640 ? 120 : 200;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME変換中はEnterで送信しない
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // プレビューモード用スタイル
  if (isPreview) {
    return (
      <form onSubmit={handleSubmit} className="bg-white px-3 py-2">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl bg-gray-100 pr-2 pb-1.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={placeholder || 'メッセージを入力...'}
              disabled={disabled}
              rows={1}
              className="flex-1 resize-none bg-transparent pl-4 pt-3 pb-1.5 text-base focus:outline-none disabled:cursor-not-allowed"
            />
            {input.trim() && !disabled && (
              <button
                type="submit"
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            AIは限られたデータを基盤にするため、重要な情報は追加で確認することをおすすめします。
          </p>
        </div>
      </form>
    );
  }

  // 通常モード
  return (
    <form onSubmit={handleSubmit} className="border-t bg-white p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder || 'メッセージを入力...'}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            送信
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">Shift + Enter で改行、Enter で送信</p>
      </div>
    </form>
  );
}
