import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center mb-12">
        <Logo className="h-12 text-slate-medium mx-auto" />
      </div>

      <div className="flex gap-6">
        <Link
          href="/admin/login"
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
        >
          管理者ログイン
        </Link>
        <Link
          href="/company/login"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          企業ログイン
        </Link>
      </div>
    </div>
  );
}
