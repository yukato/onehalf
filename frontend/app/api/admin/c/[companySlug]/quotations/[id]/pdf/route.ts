import { NextRequest, NextResponse } from 'next/server';
import { adminCompanyAuth, isAuthError } from '@/lib/admin-company-auth';
import { getQuotation } from '@/lib/quotations/queries';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotationPdfDocument } from '@/lib/pdf/quotation-pdf';
import type { QuotationPdfData, CompanyInfo } from '@/lib/pdf/quotation-pdf';
import React from 'react';

const COMPANY_INFO: CompanyInfo = {
  name: '株式会社八木厨房機器製作所',
  postalCode: '〒XXX-XXXX',
  address: '大阪府大阪市...',
  phone: 'TEL: 06-XXXX-XXXX',
  fax: 'FAX: 06-XXXX-XXXX',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string; id: string }> }
) {
  try {
    const auth = await adminCompanyAuth(request, params);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const quotation = await getQuotation(auth.companySlug, id);
    if (!quotation) return NextResponse.json({ detail: 'Not found' }, { status: 404 });

    const pdfData: QuotationPdfData = {
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      validUntil: quotation.validUntil,
      customerName: quotation.customer.name,
      subject: quotation.subject,
      items: quotation.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
    };

    const element = React.createElement(QuotationPdfDocument, { quotation: pdfData, companyInfo: COMPANY_INFO });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quotation-${quotation.quotationNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Generate quotation PDF error:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
