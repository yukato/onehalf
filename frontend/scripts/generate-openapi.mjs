import { openapiContracts } from './openapi/contracts/index.mjs';
import { buildOpenApiDocument, writeOpenApiDocument } from './openapi/build-openapi.mjs';

const doc = buildOpenApiDocument({
  title: 'onehalf API',
  version: '0.1.0',
  description: 'Generated from zod contracts in scripts/openapi/contracts',
  serverUrl: 'http://localhost:3100',
  contracts: openapiContracts,
});

const outPath = writeOpenApiDocument('public/openapi/openapi.json', doc);
console.log(`Generated: ${outPath}`);
