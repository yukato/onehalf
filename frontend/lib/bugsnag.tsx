import Bugsnag from '@bugsnag/js';
import BugsnagPluginReact from '@bugsnag/plugin-react';
import React from 'react';

const apiKey = process.env.NEXT_PUBLIC_BUGSNAG_API_KEY;

// Initialize Bugsnag only if API key is configured
if (apiKey) {
  Bugsnag.start({
    apiKey,
    plugins: [new BugsnagPluginReact()],
    releaseStage: process.env.NODE_ENV,
    appVersion: '2.0.0',
    enabledReleaseStages: ['production', 'staging'],
  });
}

// Export ErrorBoundary component (returns passthrough if Bugsnag not configured)
function PassthroughErrorBoundary({ children }: { children: React.ReactNode }) {
  return children;
}

export const ErrorBoundary = apiKey
  ? Bugsnag.getPlugin('react')!.createErrorBoundary(React)
  : PassthroughErrorBoundary;

export default Bugsnag;
