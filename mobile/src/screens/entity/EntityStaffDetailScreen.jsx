import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import CertificateBadge from '../../components/CertificateBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { staffAPI } from '../../services/api';

export default function EntityStaffDetailScreen({ route, navigation }) {
  const { staffId } = route.params;
  const [staffMember, setStaffMember] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [staffRes, certRes] = await Promise.all([
        staffAPI.getById(staffId),
        staffAPI.getCertificates(staffId),
      ]);
      setStaffMember(staffRes.data.staff ?? staffRes.data);
      setCertificates(certRes.data.certificates ?? certRes.data ?? []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <LoadingSpinner />;
  const s = staffMember || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{s.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.designation}>{s.designation || 'Staff'}</Text>
          <Text style={styles.staffId}>{s.staffId || ''}</Text>
        </View>

        <View style={styles.infoCard}>
          {[
            { label: 'Email', value: s.email, icon: 'mail-outline' },
            { label: 'Phone', value: s.phone, icon: 'call-outline' },
            { label: 'Nationality', value: s.nationality, icon: 'flag-outline' },
          ].map(row => row.value ? (
            <View key={row.label} style={styles.infoRow}>
              <Ionicons name={row.icon} size={16} color={colors.textMuted} />
              <View>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ) : null)}
        </View>

        <Text style={styles.sectionTitle}>Certificates ({certificates.length})</Text>
        {certificates.length === 0 ? <EmptyState icon="ribbon-outline" title="No certificates" /> :
          certificates.map(cert => (
            <View key={cert.id} style={styles.certCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{cert.certificateType?.name || 'Certificate'}</Text>
                {cert.expiryDate && <Text style={styles.certDate}>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</Text>}
              </View>
              <CertificateBadge status={cert.status} small />
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.primary },
  backBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { fontSize: typography.lg, fontFamily: typography.fontBold, color: colors.white },
  scroll: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontFamily: typography.fontBold, color: colors.primary },
  name: { fontSize: typography.xl, fontFamily: typography.fontBold, color: colors.text },
  designation: { fontSize: typography.sm, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 4 },
  staffId: { fontSize: typography.xs, fontFamily: typography.fontMedium, color: colors.primary, marginTop: 4 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', marginBottom: 20, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: typography.xs, color: colors.textMuted, fontFamily: typography.fontRegular },
  infoValue: { fontSize: typography.base, color: colors.text, fontFamily: typography.fontSemiBold, marginTop: 2 },
  sectionTitle: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text, marginBottom: 12 },
  certCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  certName: { fontSize: typography.base, fontFamily: typography.fontSemiBold, color: colors.text },
  certDate: { fontSize: typography.xs, fontFamily: typography.fontRegular, color: colors.textMuted, marginTop: 3 },
});
