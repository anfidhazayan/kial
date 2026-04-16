import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StaffCertificatesScreen() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCerts = useCallback(async () => {
    try {
      const res = await staffAPI.getCertificates(user?.id);
      setCertificates(res.data.certificates ?? res.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);
  const onRefresh = () => { setRefreshing(true); fetchCerts(); };

  const validCount = certificates.filter(c => c.status === 'VALID' || c.status === 'APPROVED').length;
  const expiredCount = certificates.filter(c => c.status === 'EXPIRED').length;

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Certificates</Text>
        <Text style={styles.headerSub}>{certificates.length} total</Text>
      </View>

      <View style={styles.body}>
        {/* Summary row */}
        {certificates.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.summaryNum}>{validCount}</Text>
              <Text style={styles.summaryLabel}>Valid</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryItem}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
              <Text style={styles.summaryNum}>{expiredCount}</Text>
              <Text style={styles.summaryLabel}>Expired</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryItem}>
              <Ionicons name="document-text" size={22} color={colors.textMuted} />
              <Text style={styles.summaryNum}>{certificates.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        )}

        <FlatList
          data={certificates}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.certCard}>
              <View style={styles.certIconWrap}>
                <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{item.certificateType?.name || 'Certificate'}</Text>
                {item.issuedDate && (
                  <Text style={styles.certDate}>
                    Issued: {new Date(item.issuedDate).toLocaleDateString()}
                  </Text>
                )}
                {item.expiryDate && (
                  <Text style={[styles.certDate, item.status === 'EXPIRED' && { color: colors.danger }]}>
                    Expires: {new Date(item.expiryDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <CertificateBadge status={item.status} small />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState icon="ribbon-outline" title="No certificates yet" subtitle="Your certificates will appear here once issued" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  headerTitle: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.white },
  headerSub: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryNum: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.text },
  summaryLabel: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted },
  summarySep: { width: 1, height: 40, backgroundColor: colors.border },
  certCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: colors.surface, borderRadius: 14, padding: 16, elevation: 2 },
  certIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  certName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  certDate: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 3 },
});
