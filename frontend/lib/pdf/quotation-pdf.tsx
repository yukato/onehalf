import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';
import { formatCurrencyForPdf, formatDateJP } from './format';

// Register Japanese font
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff', fontWeight: 700 },
  ],
});

// ---------- Types ----------

export interface QuotationPdfItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  quotationDate: string;
  validUntil: string | null;
  customerName: string;
  subject: string | null;
  items: QuotationPdfItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
}

export interface CompanyInfo {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
}

interface QuotationPdfProps {
  quotation: QuotationPdfData;
  companyInfo: CompanyInfo;
}

// ---------- Styles ----------

const PRIMARY = '#CC785C';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    color: '#333',
  },
  // Title
  title: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
    color: '#191919',
    letterSpacing: 8,
  },
  titleUnderline: {
    height: 2,
    backgroundColor: PRIMARY,
    marginBottom: 24,
    marginHorizontal: 'auto',
    width: 200,
  },
  // Header area
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 200,
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
    marginBottom: 4,
  },
  customerSuffix: {
    fontSize: 10,
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 10,
    marginBottom: 6,
  },
  // Subject
  subjectRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  subjectLabel: {
    fontSize: 10,
    fontWeight: 700,
    marginRight: 8,
    color: '#666',
  },
  subjectValue: {
    fontSize: 10,
  },
  // Total banner
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderRadius: 2,
  },
  totalBannerLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
  },
  totalBannerValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f0ed',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#555',
  },
  colNo: { width: 28, textAlign: 'center' },
  colName: { flex: 1 },
  colQty: { width: 50, textAlign: 'right' },
  colUnit: { width: 36, textAlign: 'center' },
  colPrice: { width: 72, textAlign: 'right' },
  colAmount: { width: 80, textAlign: 'right' },
  // Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  summaryTable: {
    width: 220,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f5f0ed',
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
  },
  summaryValue: {
    fontSize: 9,
    textAlign: 'right',
  },
  summaryLabelTotal: {
    fontSize: 10,
    fontWeight: 700,
  },
  summaryValueTotal: {
    fontSize: 10,
    fontWeight: 700,
  },
  // Notes
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#666',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 2,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#444',
  },
  // Company info footer
  companySection: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: PRIMARY,
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 8,
    color: '#555',
    marginBottom: 1,
  },
});

// ---------- Component ----------

export function QuotationPdfDocument({ quotation, companyInfo }: QuotationPdfProps): React.ReactElement {
  const q = quotation;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>御見積書</Text>
        <View style={styles.titleUnderline} />

        {/* Header: customer left, meta right */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.customerName}>{q.customerName}</Text>
            <Text style={styles.customerSuffix}>様</Text>

            {q.subject && (
              <View style={styles.subjectRow}>
                <Text style={styles.subjectLabel}>件名:</Text>
                <Text style={styles.subjectValue}>{q.subject}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaLabel}>見積番号</Text>
            <Text style={styles.metaValue}>{q.quotationNumber}</Text>
            <Text style={styles.metaLabel}>見積日</Text>
            <Text style={styles.metaValue}>{formatDateJP(q.quotationDate)}</Text>
            {q.validUntil && (
              <>
                <Text style={styles.metaLabel}>有効期限</Text>
                <Text style={styles.metaValue}>{formatDateJP(q.validUntil)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Total banner */}
        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>合計金額（税込）</Text>
          <Text style={styles.totalBannerValue}>{formatCurrencyForPdf(q.totalAmount)}</Text>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>No.</Text>
            <Text style={[styles.tableHeaderText, styles.colName]}>品名</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>数量</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>単位</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>単価</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>金額</Text>
          </View>
          {/* Table rows */}
          {q.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colNo}>{i + 1}</Text>
              <Text style={styles.colName}>{item.productName}</Text>
              <Text style={styles.colQty}>{new Intl.NumberFormat('ja-JP').format(item.quantity)}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{formatCurrencyForPdf(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatCurrencyForPdf(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>小計</Text>
              <Text style={styles.summaryValue}>{formatCurrencyForPdf(q.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>消費税</Text>
              <Text style={styles.summaryValue}>{formatCurrencyForPdf(q.taxAmount)}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>合計金額</Text>
              <Text style={styles.summaryValueTotal}>{formatCurrencyForPdf(q.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {q.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>備考</Text>
            <Text style={styles.notesText}>{q.notes}</Text>
          </View>
        )}

        {/* Company info */}
        <View style={styles.companySection}>
          <Text style={styles.companyName}>{companyInfo.name}</Text>
          <Text style={styles.companyDetail}>{companyInfo.postalCode}</Text>
          <Text style={styles.companyDetail}>{companyInfo.address}</Text>
          <Text style={styles.companyDetail}>{companyInfo.phone}</Text>
          <Text style={styles.companyDetail}>{companyInfo.fax}</Text>
        </View>
      </Page>
    </Document>
  );
}
