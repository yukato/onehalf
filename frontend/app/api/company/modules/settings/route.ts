import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyAccessToken } from '@/lib/company-auth';
import { getLlmSettings, upsertLlmSettings } from '@/lib/llm-settings/queries';
import { reprocessAllDocuments } from '@/lib/documents/queries';
import { processDocument } from '@/lib/documents/process';

async function authenticateCompany(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyCompanyAccessToken(authHeader.slice(7));
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getLlmSettings(payload.companySlug);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Company get LLM settings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await authenticateCompany(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = await upsertLlmSettings(payload.companySlug, {
      provider: body.provider,
      model: body.model,
      apiKeyAnthropic: body.apiKeyAnthropic,
      apiKeyOpenai: body.apiKeyOpenai,
      embeddingModel: body.embeddingModel,
    });

    let reprocessingCount = 0;
    if (result.embeddingModelChanged) {
      const docs = await reprocessAllDocuments(payload.companySlug);
      reprocessingCount = docs.length;
      for (const doc of docs) {
        processDocument(payload.companySlug, doc.id, doc.s3Path, doc.mimeType).catch((err) => {
          console.error(`Reprocess failed [company=${payload.companySlug}, doc=${doc.id}]:`, err);
        });
      }
    }

    const { embeddingModelChanged, ...settings } = result;
    return NextResponse.json({ ...settings, reprocessingCount });
  } catch (error) {
    console.error('Company update LLM settings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
