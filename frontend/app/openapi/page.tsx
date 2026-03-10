'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function OpenApiPage() {
  return (
    <div style={{ margin: '0 auto', maxWidth: 1200, padding: '2rem' }}>
      <SwaggerUI url="/openapi/openapi.json" />
    </div>
  );
}
