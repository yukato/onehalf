import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import React from 'react';
import { formatCurrencyForPdf, formatNumberForPdf, formatDateReiwa } from './format';

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
  notes?: string | null;
}

export interface QuotationPdfData {
  quotationNumber: string;
  quotationDate: string;
  validUntil: string | null;
  customerName: string;
  customerAttn?: string | null;
  subject: string | null;
  items: QuotationPdfItem[];
  subtotal: number;
  discount?: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  deliveryDate?: string | null;
  deliveryPlace?: string | null;
  paymentTerms?: string | null;
  createdByName?: string | null;
}

export interface CompanyInfo {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  memberships?: string[];
  licenses?: string[];
}

interface QuotationPdfProps {
  quotation: QuotationPdfData;
  companyInfo: CompanyInfo;
}

// ---------- Styles ----------

const DISCOUNT_RED = '#CC3333';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 8,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 36,
    color: '#333',
  },
  // Title
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 3,
    color: '#191919',
    letterSpacing: 12,
  },
  titleUnderline: {
    height: 1.5,
    backgroundColor: '#333',
    marginBottom: 16,
    marginHorizontal: 'auto',
    width: 180,
  },
  // Header area
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    width: '50%',
  },
  headerRight: {
    width: '45%',
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 13,
    fontWeight: 700,
    borderBottomWidth: 1.5,
    borderBottomColor: '#333',
    paddingBottom: 3,
    marginBottom: 2,
  },
  customerAttn: {
    fontSize: 8,
    marginBottom: 8,
    color: '#444',
  },
  greetingText: {
    fontSize: 7.5,
    lineHeight: 1.5,
    color: '#444',
    marginBottom: 8,
  },
  // Metadata section
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 7.5,
    width: 60,
    color: '#555',
  },
  metaValue: {
    fontSize: 7.5,
    flex: 1,
  },
  // Right header: quotation number, date
  quotationMeta: {
    marginBottom: 8,
  },
  quotationMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  quotationMetaLabel: {
    fontSize: 8,
    color: '#555',
    marginRight: 8,
  },
  quotationMetaValue: {
    fontSize: 8,
  },
  // Company info (right side, top)
  companyInfoRight: {
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  companyMembership: {
    fontSize: 6.5,
    color: '#555',
    marginBottom: 1,
  },
  companyNameRight: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 2,
  },
  companyDetailRight: {
    fontSize: 7,
    color: '#444',
    marginBottom: 1,
  },
  // Total summary banner
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
  },
  totalBannerLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#333',
  },
  totalBannerValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingVertical: 3,
    paddingHorizontal: 2,
    minHeight: 16,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  // Columns
  colNo: { width: 24, textAlign: 'center' },
  colName: { flex: 1, paddingHorizontal: 4 },
  colQty: { width: 40, textAlign: 'right', paddingRight: 4 },
  colUnit: { width: 28, textAlign: 'center' },
  colPrice: { width: 64, textAlign: 'right', paddingRight: 4 },
  colAmount: { width: 72, textAlign: 'right', paddingRight: 4 },
  // Item name with notes
  itemName: {
    fontSize: 8,
  },
  itemNotes: {
    fontSize: 6.5,
    color: '#666',
    marginTop: 1,
  },
  // Summary section
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginBottom: 12,
  },
  summaryTable: {
    width: 200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1.5,
    borderTopColor: '#333',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#555',
  },
  summaryValue: {
    fontSize: 8,
    textAlign: 'right',
  },
  summaryValueDiscount: {
    fontSize: 8,
    textAlign: 'right',
    color: DISCOUNT_RED,
  },
  summaryLabelTotal: {
    fontSize: 9,
    fontWeight: 700,
  },
  summaryValueTotal: {
    fontSize: 9,
    fontWeight: 700,
  },
  // Notes
  notesSection: {
    marginBottom: 12,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: '#555',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 7.5,
    lineHeight: 1.5,
    color: '#444',
  },
  // Section header (for 機器一覧, 工事費 etc.)
  sectionHeader: {
    fontSize: 8,
    fontWeight: 700,
    color: '#333',
    backgroundColor: '#eee',
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  // Subtotal row within table
  subtotalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: '#f5f5f5',
  },
  subtotalText: {
    fontSize: 8,
    fontWeight: 700,
  },
  // Discount row
  discountRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  discountText: {
    fontSize: 8,
    color: DISCOUNT_RED,
    fontWeight: 700,
  },
  // Order form (発注書)
  orderForm: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
  },
  orderFormTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 8,
  },
  orderFormText: {
    fontSize: 8,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  orderFormFieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  orderFormLabel: {
    fontSize: 8,
    width: 80,
    color: '#555',
  },
  orderFormLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
    height: 14,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999',
  },
});

// ---------- Helper: parse notes for delivery info ----------

function parseNotesForMeta(notes: string | null): { deliveryDate?: string; deliveryPlace?: string; conditions: string[] } {
  if (!notes) return { conditions: [] };
  const lines = notes.split('\n');
  let deliveryDate: string | undefined;
  let deliveryPlace: string | undefined;
  const conditions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('納品期日:') || trimmed.startsWith('納品期日：')) {
      deliveryDate = trimmed.replace(/^納品期日[:：]\s*/, '');
    } else if (trimmed.startsWith('納品場所:') || trimmed.startsWith('納品場所：')) {
      deliveryPlace = trimmed.replace(/^納品場所[:：]\s*/, '');
    } else if (trimmed) {
      conditions.push(trimmed);
    }
  }

  return { deliveryDate, deliveryPlace, conditions };
}

// ---------- Helper: classify items ----------

function classifyItems(items: QuotationPdfItem[]): {
  equipmentItems: (QuotationPdfItem & { index: number })[];
  constructionItems: (QuotationPdfItem & { index: number })[];
  equipmentSubtotal: number;
  constructionSubtotal: number;
} {
  const constructionKeywords = ['運搬', '搬入', '据付', '取付', '撤去', '試運転', '調整', '諸経費', '出張費', '工事'];
  const equipmentItems: (QuotationPdfItem & { index: number })[] = [];
  const constructionItems: (QuotationPdfItem & { index: number })[] = [];
  let idx = 1;

  for (const item of items) {
    const isConstruction = constructionKeywords.some(kw => item.productName.includes(kw));
    if (isConstruction) {
      constructionItems.push({ ...item, index: idx });
    } else {
      equipmentItems.push({ ...item, index: idx });
    }
    idx++;
  }

  return {
    equipmentItems,
    constructionItems,
    equipmentSubtotal: equipmentItems.reduce((s, i) => s + i.amount, 0),
    constructionSubtotal: constructionItems.reduce((s, i) => s + i.amount, 0),
  };
}

// ---------- Component ----------

export function QuotationPdfDocument({ quotation, companyInfo }: QuotationPdfProps): React.ReactElement {
  const q = quotation;
  const notesInfo = parseNotesForMeta(q.notes);
  const { equipmentItems, constructionItems, equipmentSubtotal, constructionSubtotal } = classifyItems(q.items);
  const hasDiscount = q.discount && q.discount > 0;
  const equipmentAfterDiscount = hasDiscount ? equipmentSubtotal - q.discount! : equipmentSubtotal;
  const grandSubtotal = equipmentAfterDiscount + constructionSubtotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <Text style={styles.title}>御 見 積 書</Text>
        <View style={styles.titleUnderline} />

        {/* Header: customer left, company/meta right */}
        <View style={styles.headerRow}>
          {/* Left: customer info */}
          <View style={styles.headerLeft}>
            <Text style={styles.customerName}>
              {q.customerName}　御中
            </Text>
            {q.customerAttn && (
              <Text style={styles.customerAttn}>{q.customerAttn}</Text>
            )}

            <Text style={styles.greetingText}>
              拝啓　時下ますますご清祥のこととお慶び申し上げます。{'\n'}
              平素は格別のお引き立てを賜り、厚く御礼申し上げます。{'\n'}
              下記の通りお見積り申し上げます。ご検討の程、宜しくお願い申し上げます。
            </Text>

            {/* Metadata */}
            {q.subject && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>件　　名</Text>
                <Text style={styles.metaValue}>{q.subject}</Text>
              </View>
            )}
            {notesInfo.deliveryDate && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>納品期日</Text>
                <Text style={styles.metaValue}>{notesInfo.deliveryDate}</Text>
              </View>
            )}
            {notesInfo.deliveryPlace && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>納品場所</Text>
                <Text style={styles.metaValue}>{notesInfo.deliveryPlace}</Text>
              </View>
            )}
            {q.paymentTerms && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>取引条件</Text>
                <Text style={styles.metaValue}>{q.paymentTerms}</Text>
              </View>
            )}
            {q.validUntil && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>見積有効期間</Text>
                <Text style={styles.metaValue}>{formatDateReiwa(q.validUntil)}まで</Text>
              </View>
            )}
          </View>

          {/* Right: quotation meta + company info + stamps */}
          <View style={styles.headerRight}>
            {/* Quotation number and date */}
            <View style={styles.quotationMeta}>
              <View style={styles.quotationMetaRow}>
                <Text style={styles.quotationMetaLabel}>見積No.</Text>
                <Text style={styles.quotationMetaValue}>{q.quotationNumber.replace(/^QT-\d{4}-/, '')}</Text>
              </View>
              <View style={styles.quotationMetaRow}>
                <Text style={styles.quotationMetaValue}>{formatDateReiwa(q.quotationDate)}</Text>
              </View>
            </View>

            {/* Company info */}
            <View style={styles.companyInfoRight}>
              {companyInfo.memberships?.map((m, i) => (
                <Text key={i} style={styles.companyMembership}>{m}</Text>
              ))}
              {companyInfo.licenses?.map((l, i) => (
                <Text key={i} style={styles.companyMembership}>{l}</Text>
              ))}
              <Text style={styles.companyNameRight}>{companyInfo.name}</Text>
              <Text style={styles.companyDetailRight}>〒{companyInfo.postalCode}</Text>
              <Text style={styles.companyDetailRight}>{companyInfo.address}</Text>
              <Text style={styles.companyDetailRight}>TEL {companyInfo.phone}　FAX {companyInfo.fax}</Text>
            </View>



          </View>
        </View>

        {/* Total summary banner */}
        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerLabel}>合計金額（税込）</Text>
          <Text style={styles.totalBannerValue}>{formatCurrencyForPdf(q.totalAmount)}</Text>
        </View>

        {/* Summary: subtotals */}
        <View style={styles.summarySection}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>税抜合計</Text>
              <Text style={styles.summaryValue}>{formatCurrencyForPdf(grandSubtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>消費税額（10%）</Text>
              <Text style={styles.summaryValue}>{formatCurrencyForPdf(q.taxAmount)}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text style={styles.summaryLabelTotal}>合計金額（税込）</Text>
              <Text style={styles.summaryValueTotal}>{formatCurrencyForPdf(q.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>No.</Text>
            <Text style={[styles.tableHeaderText, styles.colName]}>品名・規格</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>数量</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>単位</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>単価</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>金額</Text>
          </View>

          {/* Equipment items */}
          {equipmentItems.map((item, i) => (
            <View key={`eq-${i}`} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colNo}>{item.index}</Text>
              <View style={styles.colName}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
              </View>
              <Text style={styles.colQty}>{formatNumberForPdf(item.quantity)}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{formatNumberForPdf(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatNumberForPdf(item.amount)}</Text>
            </View>
          ))}

          {/* Equipment subtotal */}
          <View style={styles.subtotalRow}>
            <Text style={[styles.subtotalText, styles.colNo]} />
            <Text style={[styles.subtotalText, styles.colName]}>機器小計</Text>
            <Text style={styles.colQty} />
            <Text style={styles.colUnit} />
            <Text style={styles.colPrice} />
            <Text style={[styles.subtotalText, styles.colAmount]}>{formatNumberForPdf(equipmentSubtotal)}</Text>
          </View>

          {/* Discount */}
          {hasDiscount && (
            <>
              <View style={styles.discountRow}>
                <Text style={[styles.discountText, styles.colNo]} />
                <Text style={[styles.discountText, styles.colName]}>出精値引</Text>
                <Text style={styles.colQty} />
                <Text style={styles.colUnit} />
                <Text style={styles.colPrice} />
                <Text style={[styles.discountText, styles.colAmount]}>
                  ▲{formatNumberForPdf(q.discount!)}
                </Text>
              </View>
              <View style={styles.subtotalRow}>
                <Text style={[styles.subtotalText, styles.colNo]} />
                <Text style={[styles.subtotalText, styles.colName]}>機器合計</Text>
                <Text style={styles.colQty} />
                <Text style={styles.colUnit} />
                <Text style={styles.colPrice} />
                <Text style={[styles.subtotalText, styles.colAmount]}>{formatNumberForPdf(equipmentAfterDiscount)}</Text>
              </View>
            </>
          )}

          {/* Construction items */}
          {constructionItems.length > 0 && (
            <>
              {constructionItems.map((item, i) => (
                <View key={`cst-${i}`} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.colNo}>{item.index}</Text>
                  <View style={styles.colName}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
                  </View>
                  <Text style={styles.colQty}>{formatNumberForPdf(item.quantity)}</Text>
                  <Text style={styles.colUnit}>{item.unit}</Text>
                  <Text style={styles.colPrice}>{formatNumberForPdf(item.unitPrice)}</Text>
                  <Text style={styles.colAmount}>{formatNumberForPdf(item.amount)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Grand subtotal */}
          <View style={[styles.subtotalRow, { borderTopWidth: 2 }]}>
            <Text style={[styles.subtotalText, styles.colNo]} />
            <Text style={[styles.subtotalText, styles.colName]}>合計（税抜）</Text>
            <Text style={styles.colQty} />
            <Text style={styles.colUnit} />
            <Text style={styles.colPrice} />
            <Text style={[styles.subtotalText, styles.colAmount]}>{formatNumberForPdf(grandSubtotal)}</Text>
          </View>
        </View>

        {/* Notes / Conditions */}
        {notesInfo.conditions.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>備考・条件</Text>
            {notesInfo.conditions.map((line, i) => (
              <Text key={i} style={styles.notesText}>{line}</Text>
            ))}
          </View>
        )}

        {/* Footer page number */}
        <View style={styles.footer}>
          <Text>{companyInfo.name}</Text>
          <Text>1/1</Text>
        </View>
      </Page>

      {/* Page 2: Order form (発注書) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.orderForm}>
          <Text style={styles.orderFormTitle}>発 注 書</Text>

          <Text style={styles.orderFormText}>
            {companyInfo.name}　御中{'\n'}
            {'\n'}
            上記見積書（{q.quotationNumber}）の内容にて発注いたします。
          </Text>

          <View style={styles.orderFormFieldRow}>
            <Text style={styles.orderFormLabel}>発注日</Text>
            <View style={styles.orderFormLine} />
          </View>
          <View style={styles.orderFormFieldRow}>
            <Text style={styles.orderFormLabel}>貴社名</Text>
            <View style={styles.orderFormLine} />
          </View>
          <View style={styles.orderFormFieldRow}>
            <Text style={styles.orderFormLabel}>ご住所</Text>
            <View style={styles.orderFormLine} />
          </View>
          <View style={styles.orderFormFieldRow}>
            <Text style={styles.orderFormLabel}>TEL / FAX</Text>
            <View style={styles.orderFormLine} />
          </View>
          <View style={styles.orderFormFieldRow}>
            <Text style={styles.orderFormLabel}>ご担当者名</Text>
            <View style={styles.orderFormLine} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <Text style={{ fontSize: 7, color: '#999' }}>※本発注書にご記入の上、FAXまたはメールにてご返送ください。</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{companyInfo.name}</Text>
          <Text>2/2</Text>
        </View>
      </Page>
    </Document>
  );
}
