import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import SearchBar from '../../components/SearchBar';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { entitiesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EntityCertificatesScreen() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCerts = useCallback(async () => {
    try {
      const res = await entitiesAPI.getCertificates(user?.entityId);
      const data = res.data.certificates ?? res.data ?? [];
      setCertificates(data);
      setFiltered(data);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.entityId]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(certificates.filter(c =>
      c.certificateType?.name?.toLowerCase().includes(q) ||
      c.staff?.name?.toLowerCase().includes(q)
    ));
  }, [search, certificates]);

  const onRefresh = () => { setRefreshing(true); fetchCerts(); };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Entity Certificates</Text>
        <Text style={styles.headerSub}>{certificates.length} total</Text>
      </View>
      <View style={styles.body}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by type or staff..." style={{ marginBottom: 16 }} />
        <FlatList
          data={filtered}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{item.certificateType?.name || 'Certificate'}</Text>
                <Text style={styles.staffName}>{item.staff?.name || 'Unknown'}</Text>
                {item.expiryDate && (
                  <Text style={styles.expiry}>Expires: {new Date(item.expiryDate).toLocaleDateString()}</Text>
                )}
              </View>
              <CertificateBadge status={item.status} small />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={<EmptyState icon="ribbon-outline" title="No certificates found" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
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
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 16, elevation: 2 },
  certName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  staffName: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: colors.textSecondary, marginTop: 3 },
  expiry: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.warning, marginTop: 4 },
});
