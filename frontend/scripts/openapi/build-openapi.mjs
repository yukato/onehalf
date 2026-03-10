import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function buildOpenApiDocument({ title, version, description, serverUrl, contracts }) {
  const paths = {};
  for (const contract of contracts) {
    if (!paths[contract.path]) paths[contract.path] = {};
    paths[contract.path][contract.method] = contract.operation;
  }
  return {
    openapi: '3.1.0',
    info: { title, version, description },
    servers: [{ url: serverUrl }],
    paths,
  };
}

export function writeOpenApiDocument(outputPath, doc) {
  const outPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc, null, 2));
  return outPath;
}
