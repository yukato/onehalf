import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLlmSettings, upsertLlmSettings } from '@/lib/llm-settings/queries';
import { reprocessAllDocuments } from '@/lib/documents/queries';
import { processDocument } from '@/lib/documents/process';

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyAccessToken(authHeader.slice(7));
}

async function resolveCompany(companySlug: string) {
  return prisma.company.findUnique({ where: { slug: companySlug } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const settings = await getLlmSettings(companySlug);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Admin get LLM settings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> }
) {
  try {
    const payload = await authenticateAdmin(request);
    if (!payload) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const { companySlug } = await params;
    const company = await resolveCompany(companySlug);
    if (!company) {
      return NextResponse.json({ detail: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = await upsertLlmSettings(companySlug, {
      provider: body.provider,
      model: body.model,
      apiKeyAnthropic: body.apiKeyAnthropic,
      apiKeyOpenai: body.apiKeyOpenai,
      embeddingModel: body.embeddingModel,
    });

    // If embedding model changed, reprocess all documents
    let reprocessingCount = 0;
    if (result.embeddingModelChanged) {
      const docs = await reprocessAllDocuments(companySlug);
      reprocessingCount = docs.length;
      // Fire-and-forget: don't await
      for (const doc of docs) {
        processDocument(companySlug, doc.id, doc.s3Path, doc.mimeType).catch((err) => {
          console.error(`Reprocess failed [company=${companySlug}, doc=${doc.id}]:`, err);
        });
      }
    }

    const { embeddingModelChanged, ...settings } = result;
    return NextResponse.json({ ...settings, reprocessingCount });
  } catch (error) {
    console.error('Admin update LLM settings error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
