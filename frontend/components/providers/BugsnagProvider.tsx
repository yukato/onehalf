'use client';

import { ErrorBoundary } from '@/lib/bugsnag';

interface BugsnagProviderProps {
  children: React.ReactNode;
}

export function BugsnagProvider({ children }: BugsnagProviderProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
