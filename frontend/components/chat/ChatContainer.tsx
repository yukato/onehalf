'use client';

import { useState, useRef, useEffect } from 'react';
import type {
  Message as MessageType,
  FAQChatResponse,
  InternalChatResponse,
  FAQStats,
  InternalStats,
} from '@/types';
import { api } from '@/lib/api';
import { generateUUID } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { LoadingIndicator } from './LoadingIndicator';

// Re-export Message type for use in pages
export type { Message } from '@/types';

interface ChatContainerProps {
  type: 'faq' | 'internal';
  faqCategory?: string;
  initialMessages?: MessageType[];
  onCategorySelect?: (category: string) => void;
  /** プレビューモード（SP向け最適化） */
  isPreview?: boolean;
}

export function ChatContainer({
  type,
  faqCategory,
  initialMessages = [],
  onCategorySelect,
  isPreview = false,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FAQStats | InternalStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // initialMessagesが変更されたら反映
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (type === 'faq') {
          const data = await api.getFAQStats();
          setStats(data);
        } else {
          const data = await api.getInternalStats();
          setStats(data);
        }
      } catch {
        // Stats fetch failed, continue without stats
      }
    };
    fetchStats();
  }, [type]);

  const handleSubmit = async (content: string) => {
    const userMessage: MessageType = {
      id: generateUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      let response: FAQChatResponse | InternalChatResponse;

      if (type === 'faq') {
        // 会話履歴を構築（現在のメッセージを含む）
        const conversationHistory = messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        response = await api.chatFAQ(content, faqCategory, 3, conversationHistory);
      } else {
        response = await api.chatInternal(content);
      }

      const assistantMessage: MessageType = {
        id: generateUUID(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        suggestedMacros: 'suggested_macros' in response ? response.suggested_macros : undefined,
        referencedMacros: 'referenced_macros' in response ? response.referenced_macros : undefined,
        similarTickets: 'similar_tickets' in response ? response.similar_tickets : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const placeholder = isPreview
    ? 'AIに質問する'
    : type === 'faq'
      ? 'ご質問をどうぞ（例：退会方法を教えてください）'
      : 'お客様からの問い合わせ内容・返信の方向性・補足等を入力してください';

  const getDataCount = () => {
    if (!stats) return null;
    if ('article_count' in stats) {
      return `${stats.article_count.toLocaleString()}件のFAQ記事`;
    }
    return `${stats.ticket_count.toLocaleString()}件の過去チケット`;
  };

  // FAQ type で category 未選択の場合は選択UIを表示
  const showCategorySelection = type === 'faq' && !faqCategory;

  const handleCategorySelect = (category: string, label: string) => {
    // ユーザーが選択したかのようにメッセージを追加
    const userMessage: MessageType = {
      id: generateUUID(),
      role: 'user',
      content: label,
      timestamp: new Date(),
    };

    // ボットの応答メッセージ
    const botMessage: MessageType = {
      id: generateUUID(),
      role: 'assistant',
      content:
        'ご選択ありがとうございます！\nお困りごとやご不明点がございましたら、お気軽にご相談ください。\n\n※AIによるご案内のため、内容に誤りが含まれる場合があります。',
      timestamp: new Date(),
      isSystemMessage: true,
    };

    setMessages([userMessage, botMessage]);
    onCategorySelect?.(category);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4">
        <div className="max-w-4xl mx-auto space-y-3 px-3 sm:px-4">
          {/* カテゴリ選択UI（チャット形式） */}
          {showCategorySelection && (
            <div className="px-2 sm:px-4 py-2 sm:py-3">
              <div className="max-w-3xl mx-auto">
                <div className="w-full">
                  <div className="prose prose-sm max-w-none text-gray-800 font-medium">
                    <p>
                      バチェラーデート サポートへようこそ！
                      <br />
                      ご利用の会員種別を教えてください。
                    </p>
                  </div>
                  {/* 選択ボタン */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleCategorySelect('男性会員の方', '👨 男性会員')}
                      className="flex-1 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      👨 男性会員
                    </button>
                    <button
                      onClick={() => handleCategorySelect('女性会員の方', '👩 女性会員')}
                      className="flex-1 px-6 py-3 bg-rose-400 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      👩 女性会員
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 通常の初期状態（カテゴリ選択済み or internal） */}
          {!showCategorySelection && messages.length === 0 && (
            <div className="text-center py-12">
              {!isPreview && (
                <div className="inline-block px-3 py-1 mb-4 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                  PoC版
                </div>
              )}
              <p className="text-lg text-gray-600 mb-2">
                {type === 'faq'
                  ? 'ご質問をお待ちしています'
                  : 'お客様からの問い合わせ内容を入力してください'}
              </p>
              {!isPreview &&
                (stats ? (
                  <p className="text-sm text-gray-400">{getDataCount()}を元に回答を生成します</p>
                ) : (
                  <p className="text-sm text-gray-400">データを読み込み中...</p>
                ))}
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              showResolutionPrompt={type === 'faq'}
              isPreview={isPreview}
            />
          ))}

          {isLoading && <LoadingIndicator />}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSubmit={handleSubmit}
        placeholder={placeholder}
        disabled={isLoading || !stats || showCategorySelection}
        isPreview={isPreview}
      />
    </div>
  );
}
