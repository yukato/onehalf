'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { Message, SimilarTicketRef } from '@/types';
import { SourceCard } from './SourceCard';

interface ChatMessageProps {
  message: Message;
  /** FAQ チャットの場合 true - 解決確認を表示するかどうかに使用 */
  showResolutionPrompt?: boolean;
  /** プレビューモード（コピーボタン非表示） */
  isPreview?: boolean;
}

const CONTACT_FORM_URL = 'https://XXX/hc/ja/requests/new';

export const ChatMessage = React.memo(function ChatMessage({
  message,
  showResolutionPrompt = false,
  isPreview = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  // 回答に問い合わせフォームURLが含まれているかチェック
  const hasContactFormLink = message.content.includes(CONTACT_FORM_URL);
  // 解決確認を表示するかどうか（FAQ、アシスタント、URLなし、システムメッセージでない場合のみ）
  const shouldShowResolution =
    showResolutionPrompt && !isUser && !hasContactFormLink && !message.isSystemMessage;

  const handleCopy = async () => {
    try {
      // コードブロック形式でコピー（Zendeskなどで見やすい）
      const formattedContent = '```\n' + message.content + '\n```';
      await navigator.clipboard.writeText(formattedContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="px-2 sm:px-4 py-2 sm:py-3">
      <div className={clsx('max-w-3xl mx-auto', isUser ? 'flex justify-end' : '')}>
        <div className={clsx(isUser ? 'py-2 px-4 bg-gray-200 rounded-xl max-w-[85%]' : 'w-full')}>
          <div
            className={clsx(
              'prose prose-sm max-w-none [&>*:first-child]:mt-0',
              isUser ? 'text-gray-700' : 'text-gray-800'
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkBreaks, remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {children}
                  </a>
                ),
                p: ({ children, ...props }) => {
                  // 文字列の場合、【】をスタイリング
                  const processChildren = (child: React.ReactNode): React.ReactNode => {
                    if (typeof child === 'string') {
                      // ※で始まる注意書きは小さくグレーに
                      if (child.startsWith('※')) {
                        return <span className="text-xs text-gray-500">{child}</span>;
                      }
                      // 【】のスタイリング
                      const parts = child.split(/(【[^】]+】)/g);
                      if (parts.length > 1) {
                        return parts.map((part, i) => {
                          if (part.match(/^【[^】]+】$/)) {
                            return (
                              <span key={i} className="section-title">
                                {part}
                              </span>
                            );
                          }
                          return part;
                        });
                      }
                    }
                    return child;
                  };

                  const processed = Array.isArray(children)
                    ? children.map(processChildren)
                    : processChildren(children);

                  return <p {...props}>{processed}</p>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {!isUser && !isPreview && (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                {isCopied ? (
                  <>
                    <span>✓</span>
                    <span>コピーしました</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>回答をコピー</span>
                  </>
                )}
              </button>
            </div>
          )}

          {shouldShowResolution && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <span className="text-xl">💬</span>
                <div>
                  <p className="text-base font-semibold text-gray-800 mb-1">解決しましたか？</p>
                  <p className="text-sm text-gray-600 mb-3">
                    解決しない場合は、こちらからお問い合わせください。
                  </p>
                  <a
                    href={CONTACT_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                  >
                    お問い合わせフォーム
                  </a>
                </div>
              </div>
            </div>
          )}

          {message.sources && message.sources.length > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <span>📚</span>
                <span>参照情報 ({message.sources.length}件)</span>
              </div>
              <div className="space-y-2">
                {message.sources.map((source, idx) => (
                  <SourceCard key={idx} source={source} isPreview={isPreview} />
                ))}
              </div>
            </div>
          )}

          {message.similarTickets && message.similarTickets.length > 0 && !isPreview && (
            <SimilarTickets tickets={message.similarTickets} />
          )}
        </div>
      </div>
    </div>
  );
});

function SimilarTickets({ tickets }: { tickets: SimilarTicketRef[] }) {
  return (
    <div className="mt-4">
      <div className="text-sm text-gray-500 flex items-center gap-1 mb-2">
        <span>🎫</span>
        <span>過去の類似お問い合わせ ({tickets.length}件)</span>
      </div>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div
            key={ticket.ticket_id}
            className="block p-3 rounded-lg border border-gray-200 bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">
                  <span className="text-gray-400 mr-1">#{ticket.ticket_id}</span>
                  {ticket.subject}
                </p>
              </div>
              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                類似度: {(ticket.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

