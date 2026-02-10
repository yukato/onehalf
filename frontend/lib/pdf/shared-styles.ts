import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#CC785C',
  headerBg: '#191919',
  headerText: '#FFFFFF',
  border: '#D1D5DB',
  lightBg: '#F9FAFB',
  text: '#111827',
  textLight: '#6B7280',
  white: '#FFFFFF',
};

export const sharedStyles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 10,
    padding: 40,
    color: colors.text,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metaLeft: {
    width: '55%',
  },
  metaRight: {
    width: '40%',
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    borderBottom: `1px solid ${colors.text}`,
    paddingBottom: 4,
  },
  label: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    marginBottom: 6,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.lightBg,
    borderTop: `2px solid ${colors.primary}`,
    borderBottom: `2px solid ${colors.primary}`,
    padding: '8 12',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.headerBg,
    color: colors.headerText,
    fontSize: 8,
    fontWeight: 'bold',
    padding: '6 0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5px solid ${colors.border}`,
    padding: '5 0',
    minHeight: 24,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: colors.lightBg,
  },
  // Common column widths
  colNo: { width: '6%', textAlign: 'center', paddingHorizontal: 2 },
  colName: { width: '30%', paddingHorizontal: 4 },
  colQty: { width: '10%', textAlign: 'right', paddingHorizontal: 4 },
  colUnit: { width: '8%', textAlign: 'center', paddingHorizontal: 2 },
  colPrice: { width: '15%', textAlign: 'right', paddingHorizontal: 4 },
  colTax: { width: '8%', textAlign: 'center', paddingHorizontal: 2 },
  colAmount: { width: '18%', textAlign: 'right', paddingHorizontal: 4 },
  colNotes: { width: '5%', textAlign: 'center', paddingHorizontal: 2 },
  // Summary
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  summaryTable: {
    width: '40%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '4 8',
    borderBottom: `0.5px solid ${colors.border}`,
  },
  summaryLabel: {
    fontSize: 9,
    color: colors.textLight,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Notes
  notesSection: {
    marginTop: 12,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: colors.textLight,
  },
  // Stamp box
  stampBox: {
    width: 60,
    height: 60,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  stampLabel: {
    fontSize: 7,
    color: colors.textLight,
  },
});
