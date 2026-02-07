'use client';

import { useParams } from 'next/navigation';

export default function CompanyDashboardPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">
          <code className="bg-gray-100 px-2 py-0.5 rounded">{companySlug}</code> のダッシュボードです。
        </p>
        <p className="text-gray-400 text-xs mt-2">
          各社向けの機能はここに追加されていきます。
        </p>
      </div>
    </div>
  );
}
