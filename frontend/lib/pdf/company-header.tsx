import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors } from './shared-styles';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detail: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 1,
  },
});

interface CompanyHeaderProps {
  companyName?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  fax?: string;
}

export function CompanyHeader({
  companyName = '株式会社八木厨房機器製作所',
  postalCode,
  address,
  phone,
  fax,
}: CompanyHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.companyName}>{companyName}</Text>
      {postalCode && <Text style={styles.detail}>〒{postalCode}</Text>}
      {address && <Text style={styles.detail}>{address}</Text>}
      {phone && <Text style={styles.detail}>TEL: {phone}{fax ? `  FAX: ${fax}` : ''}</Text>}
    </View>
  );
}
