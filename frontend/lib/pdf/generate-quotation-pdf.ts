import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { QuotationPdfDocument } from './quotation-pdf';
import type { QuotationPdfData, CompanyInfo } from './quotation-pdf';
import type { Quotation } from '@/types';

// Default company info for mock mode (八木厨房機器製作所)
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: '株式会社八木厨房機器製作所',
  postalCode: '556-0005',
  address: '大阪府大阪市浪速区日本橋5-14-20',
  phone: '06-6631-0141',
  fax: '06-6631-0142',
  memberships: ['一般社団法人 日本厨房工業会会員'],
  licenses: ['建設業許可 大阪府知事許可（般-4）第000000号'],
};

function quotationToData(quotation: Quotation): QuotationPdfData {
  return {
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
      notes: item.notes,
    })),
    subtotal: quotation.subtotal,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    notes: quotation.notes,
    createdByName: quotation.createdByName,
  };
}

export async function generateQuotationPdfBlob(
  quotation: Quotation,
  companyInfo?: CompanyInfo,
): Promise<Blob> {
  const data = quotationToData(quotation);
  const element = createElement(QuotationPdfDocument, {
    quotation: data,
    companyInfo: companyInfo || DEFAULT_COMPANY_INFO,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(element as any).toBlob();
  return blob;
}

export async function openQuotationPdf(
  quotation: Quotation,
  companyInfo?: CompanyInfo,
): Promise<void> {
  // Open a blank window immediately (within user gesture) to avoid popup blocker
  const win = window.open('about:blank', '_blank');
  if (win) {
    win.document.title = 'PDF生成中...';
    win.document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:#666">PDF生成中...</p>';
  }

  try {
    const blob = await generateQuotationPdfBlob(quotation, companyInfo);
    const url = URL.createObjectURL(blob);

    if (win && !win.closed) {
      win.location.href = url;
    } else {
      // Fallback: download if popup was closed/blocked
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quotation.quotationNumber}.pdf`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    if (win && !win.closed) {
      win.document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:red">PDF生成に失敗しました</p>';
    }
    throw err;
  }
}
