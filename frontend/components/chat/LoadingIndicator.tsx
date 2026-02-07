'use client';

export function LoadingIndicator() {
  return (
    <div className="px-2 sm:px-4 py-2 sm:py-3">
      <div className="max-w-3xl mx-auto">
        <div className="w-full">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="animate-bounce text-gray-400" style={{ fontSize: '6px' }}>
                ●
              </span>
              <span
                className="animate-bounce text-gray-400"
                style={{ fontSize: '6px', animationDelay: '0.1s' }}
              >
                ●
              </span>
              <span
                className="animate-bounce text-gray-400"
                style={{ fontSize: '6px', animationDelay: '0.2s' }}
              >
                ●
              </span>
            </div>
            <span className="text-sm text-gray-500">回答を生成中...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
